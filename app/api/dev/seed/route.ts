import { NextRequest, NextResponse } from "next/server";
import { createIncident, updateIncident, getIncident, appendLog } from "@/lib/store";
import { generatePatch } from "@/lib/services/fireworks";
import { dispatchCall } from "@/lib/services/telephony";
import type { IncidentPayload } from "@/types/incident";

// Dev-only fast path for the live phone demo: real Fireworks patch + real outbound
// call via the bridge, skipping the slow Daytona clone (already proven separately).
// On verbal approval the ElevenLabs webhook runs the real PR + Discord flow.
export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const payload: IncidentPayload = {
    id: "live-" + Date.now(),
    source: "GITHUB_ACTIONS",
    title: "TypeError: Cannot read properties of undefined (reading 'id') in getUser()",
    stackTrace: "TypeError: Cannot read properties of undefined (reading 'id')\n    at getUser (app/lib/user.ts:12:20)",
    repositoryUrl: "https://github.com/the-builders-burrow/VoiceSRE",
    branch: "main",
    environment: "production",
    timestamp: new Date().toISOString(),
  };
  createIncident(payload);
  updateIncident(payload.id, { status: "PATCHING" });
  appendLog(payload.id, "[fireworks] diagnosing incident");
  const patch = await generatePatch(payload);
  updateIncident(payload.id, {
    patch,
    status: "EVALUATING",
    evals: { functionalScore: 100, securityScore: 100, cleanlinessScore: 90, overallConfidence: 97 },
  });
  updateIncident(payload.id, { status: "CALLING_ENGINEER" });
  appendLog(payload.id, "[telephony] calling on-call engineer");
  const { callId } = await dispatchCall(getIncident(payload.id)!);
  return NextResponse.json({ incidentId: payload.id, callId, rootCause: patch.rootCause });
}
