import type { IncidentState, IncidentStatus } from "@/types/incident";
import { AlertTriangle, Bug, GitPullRequest, Clock, ExternalLink } from "lucide-react";
import { EvalScores } from "./EvalScores";
import { TerminalStream } from "./TerminalStream";

const STATUS_META: Record<IncidentStatus, { label: string; classes: string; icon: typeof AlertTriangle }> = {
  INGESTED:       { label: "Ingested",       classes: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Bug },
  PATCHING:       { label: "Patching",       classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: Bug },
  TESTING_SANDBOX:{ label: "Testing",        classes: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: Bug },
  EVALUATING:     { label: "Evaluating",     classes: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Bug },
  CALLING_ENGINEER:{ label: "Escalated",     classes: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: AlertTriangle },
  CREATING_PR:    { label: "Creating PR",   classes: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: GitPullRequest },
  REVIEWED:       { label: "Reviewed",       classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: GitPullRequest },
  APPROVED:       { label: "Approved",       classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: GitPullRequest },
  REJECTED:       { label: "Rejected",       classes: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle },
};

const LIVE_STATUSES: IncidentStatus[] = ["INGESTED", "PATCHING", "TESTING_SANDBOX", "EVALUATING", "CREATING_PR"];

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export function IncidentCard({ state, index = 0 }: { state: IncidentState & { logs?: string[] }; index?: number }) {
  const meta = STATUS_META[state.status] ?? STATUS_META.INGESTED;
  const isLive = LIVE_STATUSES.includes(state.status);
  const Icon = meta.icon;

  return (
    <div
      className="animate-fade-in rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md"
      style={{ animationDelay: `${index * 80}ms`, borderColor: "var(--border)" }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            {isLive && (
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
            )}
            <h3 className="truncate text-sm font-semibold tracking-tight">{state.payload.title}</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatTimestamp(state.payload.timestamp)}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider">
              {state.payload.source}
            </span>
            <span className="truncate">{state.payload.repositoryUrl.split("/").slice(-2).join("/")}</span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider shrink-0 ${meta.classes}`}>
          <Icon className="size-3" />
          {meta.label}
        </span>
      </div>

      {/* Root cause */}
      {state.patch && (
        <div className="mx-5 mb-3 rounded-lg bg-muted/50 p-3 border-l-2" style={{ borderLeftColor: "var(--accent)" }}>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Root Cause</p>
          <p className="text-sm">{state.patch.rootCause}</p>
        </div>
      )}

      {/* Eval scores */}
      {state.evals && (
        <div className="px-5 pb-3">
          <EvalScores evals={state.evals} />
        </div>
      )}

      {/* Terminal */}
      <div className="px-5 pb-3">
        <TerminalStream logs={state.logs ?? []} />
      </div>

      {/* PR link */}
      {state.prUrl && (
        <div className="border-t px-5 py-3" style={{ borderColor: "var(--border)" }}>
          <a
            href={state.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline transition-colors"
          >
            <ExternalLink className="size-3" />
            View Pull Request
          </a>
        </div>
      )}
    </div>
  );
}
