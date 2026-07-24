import { describe, it, expect, vi } from "vitest";
import type { IncidentPayload } from "@/types/incident";

vi.mock("@/lib/services/fireworks", () => ({
  generatePatch: vi.fn(async () => ({
    rootCause: "rc",
    targetFile: "f.ts",
    patchDiff: "d",
    explanation: "e",
  })),
}));
vi.mock("@/lib/services/daytona", () => ({
  runSandbox: vi.fn(async () => ({
    sandboxId: "s",
    exitCode: 0,
    stdout: "",
    stderr: "",
    testsPassed: true,
  })),
}));
vi.mock("@/lib/services/braintrust", () => ({
  evaluatePatch: vi.fn(async () => ({
    functionalScore: 100,
    securityScore: 90,
    cleanlinessScore: 80,
    overallConfidence: 90,
  })),
}));
vi.mock("@/lib/services/telephony", () => ({
  dispatchCall: vi.fn(async () => ({ callId: "c1" })),
}));
vi.mock("@/lib/services/github", () => ({
  createPullRequest: vi.fn(async () => ({ prUrl: "https://github.com/x/y/pull/1" })),
}));

import { runPipeline, approveIncident } from "@/lib/pipeline";
import { getIncident } from "@/lib/store";

const payload: IncidentPayload = {
  id: "p1",
  source: "SENTRY",
  title: "t",
  stackTrace: "s",
  repositoryUrl: "https://github.com/x/y",
  branch: "main",
  environment: "prod",
  timestamp: "now",
};

describe("pipeline", () => {
  it("runs through to CALLING_ENGINEER with PR, patch, sandbox, evals set", async () => {
    await runPipeline(payload);
    const s = getIncident("p1")!;
    expect(s.patch?.rootCause).toBe("rc");
    expect(s.sandbox?.testsPassed).toBe(true);
    expect(s.evals?.overallConfidence).toBe(90);
    expect(s.status).toBe("CALLING_ENGINEER");
    expect(s.prUrl).toContain("/pull/"); // PR created automatically
  });

  it("approve marks REVIEWED (PR already open)", async () => {
    await runPipeline({ ...payload, id: "p2" });
    await approveIncident("p2");
    const s = getIncident("p2")!;
    expect(s.prUrl).toContain("/pull/");
    expect(s.status).toBe("REVIEWED");
  });
});
