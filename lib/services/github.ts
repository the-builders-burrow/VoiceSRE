import { Octokit } from "octokit";
import type { IncidentPayload, PatchResult } from "@/types/incident";

export function parseRepo(url: string): { owner: string; repo: string } {
  const m = url.replace(/\.git$/, "").match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (!m) throw new Error(`cannot parse repo from ${url}`);
  return { owner: m[1], repo: m[2] };
}

export function buildBranchName(payload: IncidentPayload): string {
  return `voicesre/fix-${payload.id}`;
}

export function buildPrBody(payload: IncidentPayload, patch: PatchResult): string {
  return [
    `## VoiceSRE Autonomous Fix`,
    `**Incident:** ${payload.title} (${payload.source}, ${payload.environment})`,
    `**Root cause:** ${patch.rootCause}`,
    `**Explanation:** ${patch.explanation}`,
    "",
    "```diff",
    patch.patchDiff,
    "```",
  ].join("\n");
}

export async function broadcastToDiscord(payload: IncidentPayload, patch: PatchResult, prUrl: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🚨 **VoiceSRE resolved** ${payload.title}\nRoot cause: ${patch.rootCause}\nPR: ${prUrl}`,
      }),
    });
  } catch {
    /* best effort */
  }
}

export async function createPullRequest(payload: IncidentPayload, patch: PatchResult): Promise<{ prUrl: string }> {
  const { owner, repo } = parseRepo(payload.repositoryUrl);
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const base = payload.branch || "main";
  const baseRef = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${base}` });
  const branch = buildBranchName(payload);

  await octokit.rest.git
    .createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseRef.data.object.sha })
    .catch(() => {
      /* branch may exist on retry */
    });

  const body = buildPrBody(payload, patch);
  // A PR needs >=1 commit between head and base, so write an incident record on the
  // branch (the proposed AI diff is shown in the PR body for CodeRabbit to review).
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `docs/incidents/${payload.id}.md`,
    branch,
    message: `chore(voicesre): incident record ${payload.id}`,
    content: Buffer.from(body).toString("base64"),
  });

  const pr = await octokit.rest.pulls.create({
    owner,
    repo,
    base,
    head: branch,
    title: `[VoiceSRE] ${payload.title}`,
    body,
  });

  await broadcastToDiscord(payload, patch, pr.data.html_url);
  return { prUrl: pr.data.html_url };
}
