import { describe, it, expect } from "vitest";
import {
  buildPatchPrompt,
  parsePatchResponse,
  buildUnifiedDiff,
  extractStackPaths,
} from "@/lib/services/fireworks";

const payload = {
  id: "1", source: "SENTRY" as const, title: "TypeError: undefined x", stackTrace: "at foo (lib/a.ts:3)",
  repositoryUrl: "https://github.com/x/y", branch: "main", environment: "prod", timestamp: "t",
};

describe("fireworks", () => {
  it("prompt includes stack trace, file contents, and demands JSON", () => {
    const p = buildPatchPrompt(payload, { "lib/a.ts": "const x = null;\nx.y;" });
    expect(p).toContain("at foo (lib/a.ts:3)");
    expect(p).toContain("const x = null;");
    expect(p.toLowerCase()).toContain("json");
  });

  it("extracts repo-relative paths from stack traces", () => {
    expect(extractStackPaths("at foo (webpack://_N_E/lib/a.ts:3)\n  at bar (node_modules/x/y.js:1)")).toEqual([
      "lib/a.ts",
    ]);
  });

  it("parses fenced JSON and generates a well-formed diff", () => {
    const raw = '```json\n{"rootCause":"rc","targetFile":"a.ts","fixedContent":"fixed line","explanation":"e"}\n```';
    const r = parsePatchResponse(raw, { "a.ts": "broken line" });
    expect(r.targetFile).toBe("a.ts");
    expect(r.fixedContent).toBe("fixed line");
    expect(r.patchDiff).toContain("--- a/a.ts");
    expect(r.patchDiff).toContain("-broken line");
    expect(r.patchDiff).toContain("+fixed line");
  });

  it("unified diff hunk counts match line counts", () => {
    const d = buildUnifiedDiff("f.ts", "a\nb", "a\nb\nc");
    expect(d).toContain("@@ -1,2 +1,3 @@");
  });
});
