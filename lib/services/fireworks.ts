import type { IncidentPayload, PatchResult } from "@/types/incident";

const FIREWORKS_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
const MODEL = "accounts/fireworks/models/deepseek-v4-pro";

export function buildPatchPrompt(payload: IncidentPayload): string {
  return [
    "You are an expert SRE. Diagnose the incident and produce a fix as a unified git diff.",
    "Respond with ONLY JSON matching:",
    '{"rootCause": string, "targetFile": string, "patchDiff": string (unified diff), "explanation": string}',
    "",
    `Title: ${payload.title}`,
    `Repo: ${payload.repositoryUrl}  Branch: ${payload.branch}  Env: ${payload.environment}`,
    "Stack trace:",
    payload.stackTrace,
  ].join("\n");
}

export function parsePatchResponse(raw: string): PatchResult {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const json = (fenced ? fenced[1] : raw).trim();
  const obj = JSON.parse(json);
  if (!obj.targetFile || typeof obj.patchDiff !== "string") {
    throw new Error("fireworks response missing targetFile/patchDiff");
  }
  return {
    rootCause: String(obj.rootCause ?? ""),
    targetFile: String(obj.targetFile),
    patchDiff: String(obj.patchDiff),
    explanation: String(obj.explanation ?? ""),
  };
}

export async function generatePatch(payload: IncidentPayload): Promise<PatchResult> {
  const res = await fetch(FIREWORKS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.2,
      messages: [{ role: "user", content: buildPatchPrompt(payload) }],
    }),
  });
  if (!res.ok) throw new Error(`fireworks ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return parsePatchResponse(data.choices[0].message.content);
}
