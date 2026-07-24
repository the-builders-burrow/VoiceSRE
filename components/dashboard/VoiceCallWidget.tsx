"use client";

import { createElement, useEffect } from "react";
import type { IncidentState } from "@/types/incident";
import { buildCallContext, buildCallSummary } from "@/lib/services/telephony";

// Public agent (auth disabled in ElevenLabs settings), so the id is safe to ship client-side.
const AGENT_ID = "agent_1101kyah0r50fmbbx9zh0vd7yegc";
const SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";

const PROMPT = [
  "You are VoiceSRE, an autonomous site-reliability engineer briefing the on-call engineer about a production incident.",
  "You have full incident context in your dynamic variables: title, environment, root cause, explanation of the fix,",
  "target file, stack trace, evaluation scores (functional, security, cleanliness, overall confidence), and the PR URL.",
  "Start by briefly stating the incident title, root cause, and overall confidence score.",
  "Then answer questions about the changed file, how the fix works, the stack trace, eval scores, and merge safety.",
  "Be conversational. When the engineer seems ready, ask: 'Would you like me to approve this pull request?'",
  "If they say approve or reject, confirm the decision in one short sentence.",
  "If you don't know something that isn't in your context, be honest about it.",
].join(" ");

// Renders the ElevenLabs web-call widget (floating bubble) bound to one incident.
// Used instead of a phone call — Twilio trial accounts block <Stream>, so PSTN
// conversational calls are impossible without upgrading the account.
export function VoiceCallWidget({ state }: { state: IncidentState }) {
  useEffect(() => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const ctx = buildCallContext(state);
  const summary = buildCallSummary(ctx);
  return createElement("elevenlabs-convai", {
    "agent-id": AGENT_ID,
    "dynamic-variables": JSON.stringify({ incident_id: state.payload.id, summary, ...ctx }),
    "override-prompt": PROMPT,
    "override-first-message": `This is VoiceSRE. ${summary} What would you like to know?`,
  });
}
