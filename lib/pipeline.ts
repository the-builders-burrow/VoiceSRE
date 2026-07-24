import type { IncidentPayload } from "@/types/incident";
import { createIncident, getIncident, updateIncident, appendLog } from "@/lib/store";
import { generatePatch } from "@/lib/services/fireworks";
import { runSandbox } from "@/lib/services/daytona";
import { evaluatePatch } from "@/lib/services/braintrust";
import { dispatchCall } from "@/lib/services/telephony";
import { createPullRequest } from "@/lib/services/github";

export async function runPipeline(payload: IncidentPayload): Promise<void> {
  createIncident(payload);

  // Wake the free-tier bridge now so it's warm when dispatchCall fires ~60s later
  fetch(`${process.env.BRIDGE_URL || "http://localhost:8080"}/health`).catch(() => {});

  updateIncident(payload.id, { status: "PATCHING" });
  appendLog(payload.id, `[fireworks] diagnosing ${payload.title}`);
  const patch = await generatePatch(payload);
  updateIncident(payload.id, { patch });

  updateIncident(payload.id, { status: "TESTING_SANDBOX" });
  const sandbox = await runSandbox(payload, patch, (line) => appendLog(payload.id, line));
  updateIncident(payload.id, { sandbox });

  updateIncident(payload.id, { status: "EVALUATING" });
  const evals = await evaluatePatch(payload, patch, sandbox);
  updateIncident(payload.id, { evals });

  // PR first, call second — the call is for discussion/review, not approval gate
  updateIncident(payload.id, { status: "CREATING_PR" });
  appendLog(payload.id, "[github] opening PR");
  const { prUrl } = await createPullRequest(payload, patch);
  updateIncident(payload.id, { status: "APPROVED", prUrl });

  // Fire-and-forget phone call — engineer can discuss PR with CodeRabbit via the call
  updateIncident(payload.id, { status: "CALLING_ENGINEER" });
  appendLog(payload.id, `[telephony] calling on-call, confidence ${evals.overallConfidence}, PR ${prUrl}`);
  dispatchCall(getIncident(payload.id)!).catch((e) =>
    appendLog(payload.id, `[telephony] call failed: ${e}`),
  );
}

export async function approveIncident(id: string): Promise<void> {
  const state = getIncident(id);
  if (!state) throw new Error(`incident ${id} not found`);
  // PR is already open — just mark reviewed
  updateIncident(id, { status: "REVIEWED" });
  appendLog(id, "[pipeline] engineer reviewed via call");
}

export function rejectIncident(id: string): void {
  updateIncident(id, { status: "REJECTED" });
  appendLog(id, "[pipeline] rejected by engineer");
}
