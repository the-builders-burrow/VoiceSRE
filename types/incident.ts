export type IncidentSource = "SENTRY" | "GITHUB_ACTIONS";

export interface IncidentPayload {
  id: string;
  source: IncidentSource;
  title: string;
  stackTrace: string;
  repositoryUrl: string;
  branch: string;
  environment: string;
  timestamp: string;
}

export interface PatchResult {
  rootCause: string;
  targetFile: string;
  patchDiff: string;
  explanation: string;
  /** Complete corrected file content — what the sandbox writes and tests. */
  fixedContent?: string;
}

export interface DaytonaExecutionResult {
  sandboxId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  testsPassed: boolean;
  sandboxUrl?: string;
}

export interface BraintrustEvalResult {
  functionalScore: number;
  securityScore: number;
  cleanlinessScore: number;
  overallConfidence: number;
}

export type IncidentStatus =
  | "INGESTED"
  | "PATCHING"
  | "TESTING_SANDBOX"
  | "EVALUATING"
  | "CREATING_PR"
  | "CALLING_ENGINEER"
  | "REVIEWED"
  | "APPROVED"
  | "REJECTED";

export interface IncidentState {
  payload: IncidentPayload;
  patch?: PatchResult;
  sandbox?: DaytonaExecutionResult;
  evals?: BraintrustEvalResult;
  prUrl?: string;
  status: IncidentStatus;
}
