import type { IncidentPayload } from "@/types/incident";
import { createIncident, getIncident, updateIncident, appendLog } from "@/lib/store";
import { generatePatch } from "@/lib/services/fireworks";
import { runSandbox } from "@/lib/services/daytona";
import { evaluatePatch } from "@/lib/services/braintrust";
import { dispatchCall } from "@/lib/services/telephony";
import { createPullRequest } from "@/lib/services/github";

export async function runPipeline(payload: IncidentPayload): Promise<void> {
  createIncident(payload);

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

  updateIncident(payload.id, { status: "CALLING_ENGINEER" });
  appendLog(payload.id, `[telephony] calling on-call, confidence ${evals.overallConfidence}`);
  await dispatchCall(getIncident(payload.id)!);
}

export async function approveIncident(id: string): Promise<void> {
  const state = getIncident(id);
  if (!state?.patch) throw new Error(`incident ${id} has no patch`);
  appendLog(id, "[github] approved — opening PR");
  const { prUrl } = await createPullRequest(state.payload, state.patch);
  updateIncident(id, { status: "APPROVED", prUrl });
}

export function rejectIncident(id: string): void {
  updateIncident(id, { status: "REJECTED" });
  appendLog(id, "[pipeline] rejected by engineer");
}
