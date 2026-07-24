"use client";

import { useEffect, useState } from "react";
import { CopilotSidebar } from "@copilotkit/react-ui";
import type { IncidentState } from "@/types/incident";
import { IncidentCard } from "@/components/dashboard/IncidentCard";
import { Activity, ShieldCheck, GitPullRequest, Radio } from "lucide-react";

type LiveIncident = IncidentState & { logs: string[] };

function StatsBar({ incidents }: { incidents: LiveIncident[] }) {
  const total = incidents.length;
  const live = incidents.filter((i) =>
    ["INGESTED", "PATCHING", "TESTING_SANDBOX", "EVALUATING"].includes(i.status)
  ).length;
  const approved = incidents.filter((i) => i.status === "APPROVED").length;
  const rejected = incidents.filter((i) => i.status === "REJECTED").length;

  const stats = [
    { label: "Total", value: total, icon: Radio, classes: "text-blue-400" },
    { label: "Live", value: live, icon: Activity, classes: "text-emerald-400" },
    { label: "Approved", value: approved, icon: ShieldCheck, classes: "text-purple-400" },
    { label: "PRs Open", value: incidents.filter((i) => i.prUrl).length, icon: GitPullRequest, classes: "text-yellow-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, classes }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
          style={{ borderColor: "var(--border)" }}
        >
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted ${classes}`}>
            <Icon className="size-4" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  const [incidents, setIncidents] = useState<LiveIncident[]>([]);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const es = new EventSource("/api/incidents/stream");
    es.onmessage = (e) => {
      try {
        setIncidents(JSON.parse(e.data));
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm" style={{ borderColor: "var(--border)" }}>
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Radio className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">VoiceSRE</h1>
              <p className="text-[11px] text-muted-foreground">Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 text-xs ${connected ? "text-emerald-400" : "text-red-400"}`}>
              <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              {connected ? "Live" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Stats */}
          <StatsBar incidents={incidents} />

          {/* Incidents grid */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Incidents
            </h2>
            {incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center" style={{ borderColor: "var(--border)" }}>
                <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
                  <ShieldCheck className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No active incidents</p>
                <p className="text-xs text-muted-foreground mt-1">All systems operational. New incidents will appear here automatically.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {incidents.map((s, i) => (
                  <IncidentCard key={s.payload.id} state={s} index={i} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Copilot sidebar */}
      <CopilotSidebar
        labels={{
          title: "VoiceSRE Copilot",
          initial: "Ask me about incidents, runbooks, or system health.",
        }}
      />
    </div>
  );
}
