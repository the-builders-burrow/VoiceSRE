import type {
  IncidentPayload,
  PatchResult,
  DaytonaExecutionResult,
  BraintrustEvalResult,
} from "@/types/incident";

export async function evaluatePatch(
  _payload: IncidentPayload,
  _patch: PatchResult,
  _sandbox: DaytonaExecutionResult,
): Promise<BraintrustEvalResult> {
  throw new Error("not implemented");
}
