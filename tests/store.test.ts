import { describe, it, expect } from "vitest";
import { createIncident, getIncident, updateIncident, appendLog, getLogs, subscribe } from "@/lib/store";
import type { IncidentPayload } from "@/types/incident";

const payload = (id: string): IncidentPayload => ({
  id,
  source: "SENTRY",
  title: "TypeError",
  stackTrace: "x",
  repositoryUrl: "r",
  branch: "main",
  environment: "prod",
  timestamp: "t",
});

describe("store", () => {
  it("creates and reads incidents in INGESTED state", () => {
    const s = createIncident(payload("a1"));
    expect(s.status).toBe("INGESTED");
    expect(getIncident("a1")?.payload.title).toBe("TypeError");
  });

  it("updates status and notifies subscribers", () => {
    createIncident(payload("a2"));
    let seen = "";
    const unsub = subscribe("a2", (s) => {
      seen = s.status;
    });
    updateIncident("a2", { status: "PATCHING" });
    expect(seen).toBe("PATCHING");
    unsub();
  });

  it("appends and reads logs", () => {
    createIncident(payload("a3"));
    appendLog("a3", "line1");
    appendLog("a3", "line2");
    expect(getLogs("a3")).toEqual(["line1", "line2"]);
  });
});
