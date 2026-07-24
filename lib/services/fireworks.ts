import type { IncidentPayload, PatchResult } from "@/types/incident";
import { fetchRepoFiles } from "@/lib/services/github";

const FIREWORKS_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
const MODEL = "accounts/fireworks/models/deepseek-v4-pro";

// Pull repo-relative source paths out of a stack trace, stripping webpack/absolute prefixes.
export function extractStackPaths(stackTrace: string): string[] {
  const out = new Set<string>();
  for (const m of stackTrace.matchAll(/([\w@][\w./-]*\.(?:ts|tsx|js|jsx|mjs|cjs))/g)) {
    const p = m[1]
      .replace(/^.*webpack[^/]*\//, "")
      .replace(/^_N_E\//, "")
      .replace(/^\.\//, "")
      .replace(/^\/+/, "");
    if (!p.includes("node_modules")) out.add(p);
  }
  return [...out].slice(0, 3);
}

export function buildPatchPrompt(payload: IncidentPayload, files: Record<string, string> = {}): string {
  const fileSections = Object.entries(files).flatMap(([p, c]) => ["", `--- ${p} ---`, c]);
  return [
    "You are an expert SRE. Diagnose the incident and fix it.",
    "Respond with ONLY JSON matching:",
    '{"rootCause": string, "targetFile": string, "fixedContent": string (the COMPLETE corrected file), "explanation": string}',
    ...(fileSections.length
      ? ["targetFile must be one of the file paths below; fixedContent must be that entire file, corrected.", ...fileSections]
      : ["No file contents were available; pick targetFile from the stack trace and write a plausible complete corrected file."]),
    "",
    `Title: ${payload.title}`,
    `Repo: ${payload.repositoryUrl}  Branch: ${payload.branch}  Env: ${payload.environment}`,
    "Stack trace:",
    payload.stackTrace,
  ].join("\n");
}

// ponytail: full-file replacement hunk, not minimal hunks — swap in a diff lib if reviewers need tight hunks.
export function buildUnifiedDiff(path: string, oldText: string, newText: string): string {
  const o = oldText === "" ? [] : oldText.replace(/\n$/, "").split("\n");
  const n = newText === "" ? [] : newText.replace(/\n$/, "").split("\n");
  return [
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -${o.length ? 1 : 0},${o.length} +${n.length ? 1 : 0},${n.length} @@`,
    ...o.map((l) => `-${l}`),
    ...n.map((l) => `+${l}`),
  ].join("\n");
}

export function parsePatchResponse(raw: string, files: Record<string, string> = {}): PatchResult {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const json = (fenced ? fenced[1] : raw).trim();
  const obj = JSON.parse(json);
  if (!obj.targetFile || typeof obj.fixedContent !== "string") {
    throw new Error("fireworks response missing targetFile/fixedContent");
  }
  const targetFile = String(obj.targetFile).replace(/^\.\//, "");
  const fixedContent = String(obj.fixedContent);
  return {
    rootCause: String(obj.rootCause ?? ""),
    targetFile,
    fixedContent,
    patchDiff: buildUnifiedDiff(targetFile, files[targetFile] ?? "", fixedContent),
    explanation: String(obj.explanation ?? ""),
  };
}

export async function generatePatch(payload: IncidentPayload): Promise<PatchResult> {
  const files = await fetchRepoFiles(payload.repositoryUrl, extractStackPaths(payload.stackTrace)).catch(
    () => ({}) as Record<string, string>,
  );
  const res = await fetch(FIREWORKS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.2,
      messages: [{ role: "user", content: buildPatchPrompt(payload, files) }],
    }),
  });
  if (!res.ok) throw new Error(`fireworks ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return parsePatchResponse(data.choices[0].message.content, files);
}
