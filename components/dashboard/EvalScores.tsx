import type { BraintrustEvalResult } from "@/types/incident";

export function EvalScores({ evals }: { evals: BraintrustEvalResult }) {
  const rows: [string, number][] = [
    ["Functional", evals.functionalScore],
    ["Security", evals.securityScore],
    ["Cleanliness", evals.cleanlinessScore],
    ["Confidence", evals.overallConfidence],
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {rows.map(([label, v]) => (
        <div key={label} className="rounded bg-neutral-800 p-2 text-center">
          <div className="text-xs text-neutral-400">{label}</div>
          <div className="text-lg font-bold text-emerald-400">{v}</div>
        </div>
      ))}
    </div>
  );
}
