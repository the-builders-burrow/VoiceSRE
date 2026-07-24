import type {
  IncidentPayload,
  PatchResult,
  DaytonaExecutionResult,
  BraintrustEvalResult,
} from "@/types/incident";

const SECRET_RE = /(sk-[a-z0-9]{8,}|ghp_[a-z0-9]{8,}|AKIA[0-9A-Z]{12,}|-----BEGIN)/i;

export function functionalScore(sandbox: DaytonaExecutionResult): number {
  return sandbox.testsPassed ? 100 : 0;
}

export function securityScore(diff: string): number {
  const added = diff.split("\n").filter((l) => l.startsWith("+"));
  return added.some((l) => SECRET_RE.test(l)) ? 30 : 100;
}

export function cleanlinessScore(diff: string): number {
  const changed = diff.split("\n").filter((l) => /^[+-]/.test(l) && !/^[+-]{3}/.test(l)).length;
  return Math.max(0, Math.round(100 - Math.max(0, changed - 20) * 0.5));
}

export function overallConfidence(f: number, s: number, c: number): number {
  return Math.round(f * 0.5 + s * 0.3 + c * 0.2);
}

export async function evaluatePatch(
  payload: IncidentPayload,
  patch: PatchResult,
  sandbox: DaytonaExecutionResult,
): Promise<BraintrustEvalResult> {
  const functional = functionalScore(sandbox);
  const security = securityScore(patch.patchDiff);
  const cleanliness = cleanlinessScore(patch.patchDiff);
  const overall = overallConfidence(functional, security, cleanliness);

  // best-effort telemetry; never blocks the pipeline
  try {
    const { initLogger } = await import("braintrust");
    const logger = initLogger({ projectName: "VoiceSRE", apiKey: process.env.BRAINTRUST_API_KEY });
    logger.log({
      input: { title: payload.title, diff: patch.patchDiff },
      output: { functional, security, cleanliness, overall },
      metadata: { source: payload.source },
    });
  } catch {
    /* telemetry optional */
  }

  return {
    functionalScore: functional,
    securityScore: security,
    cleanlinessScore: cleanliness,
    overallConfidence: overall,
  };
}
