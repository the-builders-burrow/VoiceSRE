import { describe, it, expect } from "vitest";
import { parseRepo, buildBranchName, buildPrBody } from "@/lib/services/github";

const payload = { id: "abc123", source: "SENTRY" as const, title: "Fix TypeError", stackTrace: "s", repositoryUrl: "https://github.com/acme/widgets", branch: "main", environment: "prod", timestamp: "t" };
const patch = { rootCause: "null deref", targetFile: "a.ts", patchDiff: "d", explanation: "guard added" };

describe("github helpers", () => {
  it("parses owner/repo from url", () => {
    expect(parseRepo("https://github.com/acme/widgets")).toEqual({ owner: "acme", repo: "widgets" });
    expect(parseRepo("https://github.com/acme/widgets.git")).toEqual({ owner: "acme", repo: "widgets" });
  });
  it("branch name is deterministic and safe", () => {
    expect(buildBranchName(payload)).toBe("voicesre/fix-abc123");
  });
  it("PR body includes root cause and explanation", () => {
    const b = buildPrBody(payload, patch);
    expect(b).toContain("null deref");
    expect(b).toContain("guard added");
  });
});
