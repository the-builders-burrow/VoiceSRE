import type { IncidentPayload, IncidentState } from "@/types/incident";

type Listener = (state: IncidentState) => void;

const incidents = new Map<string, IncidentState>();
const logs = new Map<string, string[]>();
const listeners = new Map<string, Set<Listener>>();

// ponytail: process-local in-memory store, fine for single-instance demo; swap for Redis if multi-instance.
function notify(id: string) {
  const s = incidents.get(id);
  if (!s) return;
  listeners.get(id)?.forEach((cb) => cb(s));
}

export function createIncident(payload: IncidentPayload): IncidentState {
  const state: IncidentState = { payload, status: "INGESTED" };
  incidents.set(payload.id, state);
  logs.set(payload.id, []);
  notify(payload.id);
  return state;
}

export function getIncident(id: string): IncidentState | undefined {
  return incidents.get(id);
}

export function listIncidents(): IncidentState[] {
  return [...incidents.values()];
}

export function updateIncident(id: string, patch: Partial<IncidentState>): IncidentState {
  const cur = incidents.get(id);
  if (!cur) throw new Error(`incident ${id} not found`);
  const next = { ...cur, ...patch };
  incidents.set(id, next);
  notify(id);
  return next;
}

export function appendLog(id: string, line: string): void {
  const arr = logs.get(id) ?? [];
  arr.push(line);
  logs.set(id, arr);
  notify(id);
}

export function getLogs(id: string): string[] {
  return logs.get(id) ?? [];
}

export function subscribe(id: string, cb: Listener): () => void {
  const set = listeners.get(id) ?? new Set<Listener>();
  set.add(cb);
  listeners.set(id, set);
  return () => set.delete(cb);
}
