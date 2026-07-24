import type { BraintrustEvalResult } from "@/types/incident";
import { Shield, Wrench, Sparkles, Target } from "lucide-react";

const METRICS: { key: keyof BraintrustEvalResult; label: string; icon: typeof Shield }[] = [
  { key: "functionalScore",   label: "Functional",  icon: Wrench },
  { key: "securityScore",     label: "Security",    icon: Shield },
  { key: "cleanlinessScore",  label: "Clean",       icon: Sparkles },
  { key: "overallConfidence", label: "Confidence",  icon: Target },
];

function barColor(v: number) {
  if (v >= 80) return "bg-emerald-500";
  if (v >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

export function EvalScores({ evals }: { evals: BraintrustEvalResult }) {
  return (
    <div className="flex flex-wrap gap-2">
      {METRICS.map(({ key, label, icon: Icon }) => {
        const v = evals[key];
        return (
          <div key={key} className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
            <Icon className="size-3 shrink-0 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
            <span className={`text-xs font-bold tabular-nums ${v >= 80 ? "text-emerald-400" : v >= 60 ? "text-yellow-400" : "text-red-400"}`}>
              {v}%
            </span>
            <div className="h-1 w-8 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor(v)}`} style={{ width: `${Math.min(100, Math.max(0, v))}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
