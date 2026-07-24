import { Daytona } from "@daytonaio/sdk";
import type { IncidentPayload, PatchResult, DaytonaExecutionResult } from "@/types/incident";

export function parseTestResult(exitCode: number, _stdout: string): boolean {
  return exitCode === 0;
}

export async function runSandbox(
  payload: IncidentPayload,
  patch: PatchResult,
  onLog?: (line: string) => void,
): Promise<DaytonaExecutionResult> {
  const log = (l: string) => onLog?.(l);
  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_SERVER_URL,
  });

  const sandbox = await daytona.create();
  let stdout = "";
  let stderr = "";

  const run = async (cmd: string) => {
    log(`$ ${cmd}`);
    const r = await sandbox.process.executeCommand(cmd);
    stdout += r.result ?? "";
    log(r.result ?? "");
    return r;
  };

  try {
    await run(`git clone ${payload.repositoryUrl} repo`);
    if (patch.fixedContent) {
      // LLM output lands in a shell command — strip anything path-unlike before interpolating
      const safePath = patch.targetFile.replace(/[^\w./@-]/g, "");
      const b64 = Buffer.from(patch.fixedContent).toString("base64");
      await run(
        `bash -lc 'cd repo && mkdir -p "$(dirname "${safePath}")" && echo ${b64} | base64 -d > "${safePath}"'`,
      );
    }
    // ponytail: prefers the repo's dependency-free CI check (demo repo ships scripts/ci-check.js);
    // falls back to npm install + test for repos without one
    const test = await run(
      "bash -lc 'cd repo && if [ -f scripts/ci-check.js ]; then node scripts/ci-check.js; else npm install --silent && npm test --silent; fi'",
    );
    const exitCode = test.exitCode ?? 1;
    return {
      sandboxId: sandbox.id,
      exitCode,
      stdout,
      stderr,
      testsPassed: parseTestResult(exitCode, stdout),
      sandboxUrl: undefined,
    };
  } catch (e) {
    stderr = String(e);
    return { sandboxId: sandbox.id, exitCode: 1, stdout, stderr, testsPassed: false };
  } finally {
    await daytona.delete(sandbox).catch(() => {});
  }
}
