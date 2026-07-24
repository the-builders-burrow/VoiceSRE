"use client";

import { useEffect, useState } from "react";
import { CopilotSidebar } from "@copilotkit/react-ui";
import type { IncidentState } from "@/types/incident";
import { IncidentCard } from "@/components/dashboard/IncidentCard";

type LiveIncident = IncidentState & { logs: string[] };

export default function Page() {
  const [incidents, setIncidents] = useState<LiveIncident[]>([]);

  useEffect(() => {
    const es = new EventSource("/api/incidents/stream");
    es.onmessage = (e) => setIncidents(JSON.parse(e.data));
    return () => es.close();
  }, []);

  return (
    <main className="min-h-screen flex-1 bg-neutral-950 p-6 text-neutral-100">
      <h1 className="mb-6 text-2xl font-bold">VoiceSRE — Command Center</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {incidents.length === 0 && <p className="text-neutral-500">No active incidents.</p>}
        {incidents.map((s) => (
          <IncidentCard key={s.payload.id} state={s} />
        ))}
      </div>
      <CopilotSidebar labels={{ title: "VoiceSRE Copilot", initial: "Ask me about incidents." }} />
    </main>
  );
}
