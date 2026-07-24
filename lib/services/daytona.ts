import type { IncidentPayload, PatchResult, DaytonaExecutionResult } from "@/types/incident";

export async function runSandbox(
  _payload: IncidentPayload,
  _patch: PatchResult,
  _onLog?: (line: string) => void,
): Promise<DaytonaExecutionResult> {
  throw new Error("not implemented");
}
