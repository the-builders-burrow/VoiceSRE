import type { IncidentState } from "@/types/incident";

export async function dispatchCall(_state: IncidentState): Promise<{ callId: string }> {
  throw new Error("not implemented");
}
