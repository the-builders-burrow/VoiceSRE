import type { IncidentPayload, PatchResult } from "@/types/incident";

export async function createPullRequest(
  _payload: IncidentPayload,
  _patch: PatchResult,
): Promise<{ prUrl: string }> {
  throw new Error("not implemented");
}
