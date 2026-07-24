import { describe, it, expect } from "vitest";
import { buildCallPrompt, classifyTranscript } from "@/lib/services/telephony";

const state = {
  payload: { id: "1", source: "SENTRY" as const, title: "TypeError", stackTrace: "s", repositoryUrl: "r", branch: "main", environment: "prod", timestamp: "t" },
  patch: { rootCause: "null deref in foo", targetFile: "a.ts", patchDiff: "d", explanation: "e" },
  evals: { functionalScore: 100, securityScore: 90, cleanlinessScore: 80, overallConfidence: 90 },
  status: "CALLING_ENGINEER" as const,
};

describe("telephony", () => {
  it("prompt states root cause and confidence", () => {
    const p = buildCallPrompt(state);
    expect(p).toContain("null deref in foo");
    expect(p).toContain("90");
  });
  it("classifies transcripts", () => {
    expect(classifyTranscript("Yes, approve the PR")).toBe("APPROVE");
    expect(classifyTranscript("No, reject that")).toBe("REJECT");
    expect(classifyTranscript("what?")).toBe("UNCLEAR");
  });
});
