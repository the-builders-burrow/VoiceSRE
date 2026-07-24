import { describe, it, expect } from "vitest";
import { functionalScore, securityScore, cleanlinessScore, overallConfidence } from "@/lib/services/braintrust";

const sandbox = (passed: boolean) => ({ sandboxId: "s", exitCode: passed ? 0 : 1, stdout: "", stderr: "", testsPassed: passed });

describe("braintrust scorers", () => {
  it("functional is 100 on pass, 0 on fail", () => {
    expect(functionalScore(sandbox(true))).toBe(100);
    expect(functionalScore(sandbox(false))).toBe(0);
  });
  it("security penalizes hardcoded secrets", () => {
    expect(securityScore("+const k = 'sk-abcdef123456'")).toBeLessThan(100);
    expect(securityScore("+const x = 1")).toBe(100);
  });
  it("cleanliness penalizes large diffs", () => {
    const big = Array.from({ length: 300 }, () => "+x").join("\n");
    expect(cleanlinessScore(big)).toBeLessThan(cleanlinessScore("+x\n+y"));
  });
  it("overall is a weighted blend", () => {
    expect(overallConfidence(100, 100, 100)).toBe(100);
    expect(overallConfidence(0, 100, 100)).toBeLessThan(60);
  });
});
