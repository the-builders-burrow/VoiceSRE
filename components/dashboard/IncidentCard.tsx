import type { IncidentState, IncidentStatus } from "@/types/incident";
import { EvalScores } from "./EvalScores";
import { TerminalStream } from "./TerminalStream";

const BADGE: Record<IncidentStatus, string> = {
  INGESTED: "bg-blue-600",
  PATCHING: "bg-yellow-600",
  TESTING_SANDBOX: "bg-orange-600",
  EVALUATING: "bg-purple-600",
  CALLING_ENGINEER: "bg-pink-600",
  APPROVED: "bg-emerald-600",
  REJECTED: "bg-red-600",
};

export function IncidentCard({ state }: { state: IncidentState & { logs?: string[] } }) {
  return (
    <div className="space-y-3 rounded-lg border border-neutral-700 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-neutral-100">{state.payload.title}</h3>
        <span className={`rounded px-2 py-1 text-xs text-white ${BADGE[state.status] ?? "bg-neutral-600"}`}>
          {state.status}
        </span>
      </div>
      {state.patch && <p className="text-sm text-neutral-400">Root cause: {state.patch.rootCause}</p>}
      {state.evals && <EvalScores evals={state.evals} />}
      <TerminalStream logs={state.logs ?? []} />
      {state.prUrl && (
        <a href={state.prUrl} className="text-sm text-blue-400 underline">
          View PR →
        </a>
      )}
    </div>
  );
}
