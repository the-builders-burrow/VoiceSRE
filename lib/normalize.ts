import type { IncidentPayload } from "@/types/incident";

function stackFromSentry(body: any): string {
  try {
    const entry = body.event?.entries?.find((e: any) => e.type === "exception");
    const frames = entry?.data?.values?.[0]?.stacktrace?.frames ?? [];
    return frames.map((f: any) => `  at ${f.filename}:${f.lineNo}`).join("\n") || body.event?.title || "";
  } catch { return ""; }
}

export function normalizeSentry(body: any): IncidentPayload {
  const issue = body.data?.issue ?? {};
  return {
    id: `sentry-${issue.id ?? Date.now()}`,
    source: "SENTRY",
    title: issue.title ?? issue.metadata?.value ?? "Sentry incident",
    stackTrace: stackFromSentry(body) || (issue.metadata?.value ?? ""),
    repositoryUrl: process.env.DEFAULT_REPO_URL ?? "",
    branch: body.event?.release ?? "main",
    environment: body.event?.environment ?? "production",
    timestamp: new Date().toISOString(),
  };
}

export function normalizeGithub(body: any): IncidentPayload {
  const run = body.workflow_run ?? {};
  return {
    id: `gha-${run.id ?? Date.now()}`,
    source: "GITHUB_ACTIONS",
    title: `CI failed: ${run.name ?? "workflow"}`,
    stackTrace: `Workflow ${run.name} concluded ${run.conclusion} on ${run.head_sha}`,
    repositoryUrl: body.repository?.html_url ?? "",
    branch: run.head_branch ?? "main",
    environment: "ci",
    timestamp: new Date().toISOString(),
  };
}
