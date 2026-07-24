import type { IncidentState } from "@/types/incident";

export interface CallContext {
  title: string;
  environment: string;
  source: string;
  rootCause: string;
  explanation: string;
  targetFile: string;
  stackTrace: string;
  functionalScore: number;
  securityScore: number;
  cleanlinessScore: number;
  confidence: number;
  prUrl: string;
}

export function buildCallContext(state: IncidentState): CallContext {
  return {
    title: state.payload.title,
    environment: state.payload.environment,
    source: state.payload.source,
    rootCause: state.patch?.rootCause ?? "unknown",
    explanation: state.patch?.explanation ?? "no explanation available",
    targetFile: state.patch?.targetFile ?? "unknown",
    stackTrace: state.payload.stackTrace.slice(0, 1500),
    functionalScore: state.evals?.functionalScore ?? 0,
    securityScore: state.evals?.securityScore ?? 0,
    cleanlinessScore: state.evals?.cleanlinessScore ?? 0,
    confidence: state.evals?.overallConfidence ?? 0,
    prUrl: state.prUrl ?? "not yet created",
  };
}

// One-line summary for the spoken opener — agent elaborates from full context.
export function buildCallSummary(ctx: CallContext): string {
  return `Production incident on ${ctx.environment}: ${ctx.title}. Root cause: ${ctx.rootCause}. Safety confidence ${ctx.confidence}%.`;
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
// Sends full incident context in POST body — bridge stores it and injects into
// ElevenLabs dynamic_variables so the agent can answer follow-up questions.
export async function dispatchCall(state: IncidentState): Promise<{ callId: string }> {
  const bridgeUrl = process.env.BRIDGE_URL || "http://localhost:8080";
  const ctx = buildCallContext(state);
  const res = await fetch(`${bridgeUrl}/outbound-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      number: process.env.ON_CALL_PHONE_NUMBER,
      incidentId: state.payload.id,
      summary: buildCallSummary(ctx),
      context: ctx,
    }),
  });
  if (!res.ok) throw new Error(`bridge call ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { callId: data.callSid ?? "unknown" };
}
