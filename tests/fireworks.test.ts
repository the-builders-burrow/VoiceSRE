import { describe, it, expect } from "vitest";
import { buildPatchPrompt, parsePatchResponse } from "@/lib/services/fireworks";

const payload = {
  id: "1", source: "SENTRY" as const, title: "TypeError: undefined x", stackTrace: "at foo (a.ts:3)",
  repositoryUrl: "https://github.com/x/y", branch: "main", environment: "prod", timestamp: "t",
};

describe("fireworks", () => {
  it("prompt includes stack trace and demands JSON", () => {
    const p = buildPatchPrompt(payload);
    expect(p).toContain("at foo (a.ts:3)");
    expect(p.toLowerCase()).toContain("json");
  });

  it("parses fenced JSON response", () => {
    const raw = '```json\n{"rootCause":"rc","targetFile":"a.ts","patchDiff":"--- a\\n+++ b","explanation":"e"}\n```';
    const r = parsePatchResponse(raw);
    expect(r.targetFile).toBe("a.ts");
    expect(r.patchDiff).toContain("+++");
  });
});
