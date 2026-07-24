import type { IncidentPayload, PatchResult } from "@/types/incident";

export async function generatePatch(_payload: IncidentPayload): Promise<PatchResult> {
  throw new Error("not implemented");
}
