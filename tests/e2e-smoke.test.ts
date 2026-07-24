import { describe, it, expect, vi } from "vitest";
import type { IncidentPayload } from "@/types/incident";

// Full happy-path smoke: INGESTED -> APPROVED, all external services faked.
vi.mock("@/lib/services/fireworks", () => ({
  generatePatch: vi.fn(async () => ({
    rootCause: "null deref in foo",
    targetFile: "app/lib/foo.ts",
    patchDiff: "--- a\n+++ b\n+  if (!x) return;",
    explanation: "guard added",
  })),
}));
vi.mock("@/lib/services/daytona", () => ({
  runSandbox: vi.fn(async (_p, _patch, onLog?: (l: string) => void) => {
    onLog?.("$ pnpm test");
    return { sandboxId: "s1", exitCode: 0, stdout: "5 passed", stderr: "", testsPassed: true };
  }),
}));
vi.mock("@/lib/services/braintrust", () => ({
  evaluatePatch: vi.fn(async () => ({
    functionalScore: 100,
    securityScore: 100,
    cleanlinessScore: 90,
    overallConfidence: 97,
  })),
}));
vi.mock("@/lib/services/telephony", () => ({
  dispatchCall: vi.fn(async () => ({ callId: "call-1" })),
}));
vi.mock("@/lib/services/github", () => ({
  createPullRequest: vi.fn(async () => ({ prUrl: "https://github.com/acme/widgets/pull/7" })),
}));

import { runPipeline, approveIncident } from "@/lib/pipeline";
import { getIncident, getLogs } from "@/lib/store";

const payload: IncidentPayload = {
  id: "e2e-1",
  source: "GITHUB_ACTIONS",
  title: "CI failed: build",
  stackTrace: "boom",
  repositoryUrl: "https://github.com/acme/widgets",
  branch: "main",
  environment: "ci",
  timestamp: "now",
};

describe("e2e smoke", () => {
  it("drives an incident from ingest through approval", async () => {
    await runPipeline(payload);

    const mid = getIncident("e2e-1")!;
    expect(mid.status).toBe("CALLING_ENGINEER");
    expect(mid.patch?.targetFile).toBe("app/lib/foo.ts");
    expect(mid.sandbox?.testsPassed).toBe(true);
    expect(mid.evals?.overallConfidence).toBe(97);

    // logs captured along the way (fireworks diagnose, daytona command, telephony)
    const logs = getLogs("e2e-1").join("\n");
    expect(logs).toContain("[fireworks]");
    expect(logs).toContain("$ pnpm test");
    expect(logs).toContain("[telephony]");

    await approveIncident("e2e-1");
    const done = getIncident("e2e-1")!;
    expect(done.status).toBe("APPROVED");
    expect(done.prUrl).toBe("https://github.com/acme/widgets/pull/7");
    expect(getLogs("e2e-1").join("\n")).toContain("[github]");
  });
});
