import type { BraintrustEvalResult } from "@/types/incident";
import { Shield, Wrench, Sparkles, Target } from "lucide-react";

const METRICS: { key: keyof BraintrustEvalResult; label: string; icon: typeof Shield }[] = [
  { key: "functionalScore",   label: "Functional",  icon: Wrench },
  { key: "securityScore",     label: "Security",    icon: Shield },
  { key: "cleanlinessScore",  label: "Cleanliness", icon: Sparkles },
  { key: "overallConfidence", label: "Confidence",  icon: Target },
];

function barColor(v: number) {
  if (v >= 80) return "bg-emerald-500";
  if (v >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

export function EvalScores({ evals }: { evals: BraintrustEvalResult }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {METRICS.map(({ key, label, icon: Icon }) => {
        const v = evals[key];
        return (
          <div key={key} className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Icon className="size-3" />
                {label}
              </span>
              <span className="text-sm font-bold tabular-nums" style={{ color: v >= 80 ? "oklch(0.623 0.214 160)" : v >= 60 ? "oklch(0.795 0.165 85)" : "oklch(0.577 0.215 27)" }}>
                {v}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(v)}`}
                style={{ width: `${Math.min(100, Math.max(0, v))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
