import { describe, it, expect } from "vitest";
import { parseTestResult } from "@/lib/services/daytona";

describe("daytona parseTestResult", () => {
  it("passes only on exit 0", () => {
    expect(parseTestResult(0, "Tests: 5 passed")).toBe(true);
    expect(parseTestResult(1, "Tests: 1 failed")).toBe(false);
  });
});
