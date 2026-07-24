import type { IncidentState } from "@/types/incident";

const AGENT_ID = process.env.ELEVENLABS_AGENT_ID!;

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

// Outbound call via ElevenLabs Conversational AI over Twilio.
// Endpoint/body verified against current ElevenLabs docs (POST /v1/convai/twilio/outbound-call,
// body: agent_id, agent_phone_number_id, to_number, conversation_initiation_client_data.dynamic_variables;
// response: { success, message, conversation_id, callSid }).
export async function dispatchCall(state: IncidentState): Promise<{ callId: string }> {
  const res = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: AGENT_ID,
      // ElevenLabs expects the phone-number ID from an imported Twilio number
      // (phnum_...), NOT the raw E.164 number. Import via POST /v1/convai/phone-numbers.
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: process.env.ON_CALL_PHONE_NUMBER,
      conversation_initiation_client_data: {
        dynamic_variables: {
          incident_id: state.payload.id,
          summary: buildCallPrompt(state),
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`elevenlabs call ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { callId: data.conversation_id ?? data.callSid ?? "unknown" };
}
