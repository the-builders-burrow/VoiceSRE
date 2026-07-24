import { describe, it, expect } from "vitest";
import { buildCallContext, buildCallSummary, classifyTranscript } from "@/lib/services/telephony";

const state = {
  payload: { id: "1", source: "SENTRY" as const, title: "TypeError", stackTrace: "s", repositoryUrl: "r", branch: "main", environment: "prod", timestamp: "t" },
  patch: { rootCause: "null deref in foo", targetFile: "a.ts", patchDiff: "d", explanation: "e" },
  evals: { functionalScore: 100, securityScore: 90, cleanlinessScore: 80, overallConfidence: 90 },
  prUrl: "https://github.com/example/pull/1",
  status: "CALLING_ENGINEER" as const,
};

describe("telephony", () => {
  it("context includes root cause and all scores", () => {
    const ctx = buildCallContext(state);
    expect(ctx.rootCause).toBe("null deref in foo");
    expect(ctx.confidence).toBe(90);
    expect(ctx.functionalScore).toBe(100);
    expect(ctx.targetFile).toBe("a.ts");
    expect(ctx.prUrl).toContain("/pull/");
  });
  it("summary is a one-line opener", () => {
    const s = buildCallSummary(buildCallContext(state));
    expect(s).toContain("null deref in foo");
    expect(s).toContain("90%");
    expect(s.length).toBeLessThan(200);
  });
  it("classifies transcripts", () => {
    expect(classifyTranscript("Yes, approve the PR")).toBe("APPROVE");
    expect(classifyTranscript("No, reject that")).toBe("REJECT");
    expect(classifyTranscript("what?")).toBe("UNCLEAR");
  });
});
