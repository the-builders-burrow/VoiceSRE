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
    // write diff then apply, escaped via base64 to avoid shell-quoting the raw diff
    const b64 = Buffer.from(patch.patchDiff).toString("base64");
    await run(`bash -lc 'cd repo && echo ${b64} | base64 -d > fix.diff && git apply fix.diff'`);
    await run("bash -lc 'cd repo && pnpm install'");
    const test = await run("bash -lc 'cd repo && pnpm test'");
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
