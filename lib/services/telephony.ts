import type { IncidentState } from "@/types/incident";

export function buildCallPrompt(state: IncidentState): string {
  const rc = state.patch?.rootCause ?? "unknown";
  const conf = state.evals?.overallConfidence ?? 0;
  return `Incident on ${state.payload.environment}. Root cause: ${rc}. Safety confidence is ${conf} out of 100. Say approve to open the pull request, or reject.`;
}

export function classifyTranscript(text: string): "APPROVE" | "REJECT" | "UNCLEAR" {
  const t = text.toLowerCase();
  if (/\b(reject|no|deny|decline)\b/.test(t)) return "REJECT";
  if (/\b(approve|yes|confirm|ship|go ahead)\b/.test(t)) return "APPROVE";
  return "UNCLEAR";
}

// Outbound call via the local telephony bridge (bridge/server.mjs), which streams
// Twilio Media Streams <-> ElevenLabs Conversational AI. This avoids importing the
// Twilio number into ElevenLabs (blocked on Twilio trial accounts, error 20003).
// The bridge places the Twilio call and speaks `summary` through the agent.
export async function dispatchCall(state: IncidentState): Promise<{ callId: string }> {
  const bridgeUrl = process.env.BRIDGE_URL || "http://localhost:8080";
  const res = await fetch(`${bridgeUrl}/outbound-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      number: process.env.ON_CALL_PHONE_NUMBER,
      incidentId: state.payload.id,
      summary: buildCallPrompt(state),
    }),
  });
  if (!res.ok) throw new Error(`bridge call ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { callId: data.callSid ?? "unknown" };
}
