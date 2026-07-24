import { describe, it, expect } from "vitest";
import { normalizeSentry, normalizeGithub } from "@/lib/normalize";

describe("normalize", () => {
  it("maps a Sentry issue payload", () => {
    const body = {
      data: { issue: { id: "SEN-1", title: "TypeError: x", metadata: { value: "x is undefined" } } },
      event: { environment: "production", entries: [{ type: "exception", data: { values: [{ stacktrace: { frames: [{ filename: "a.ts", lineNo: 3 }] } }] } }] },
    };
    const p = normalizeSentry(body);
    expect(p.source).toBe("SENTRY");
    expect(p.title).toContain("TypeError");
    expect(p.stackTrace).toContain("a.ts");
  });

  it("maps a GitHub Actions failure payload", () => {
    const body = {
      action: "completed",
      workflow_run: { id: 42, name: "CI", conclusion: "failure", head_branch: "main", head_sha: "deadbeef" },
      repository: { html_url: "https://github.com/acme/widgets" },
    };
    const p = normalizeGithub(body);
    expect(p.source).toBe("GITHUB_ACTIONS");
    expect(p.repositoryUrl).toBe("https://github.com/acme/widgets");
    expect(p.branch).toBe("main");
  });
});
