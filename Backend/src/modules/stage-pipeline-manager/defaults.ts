export const SUBMITTED_RESUME_STAGE = "Submitted resume";

export const DEFAULT_PIPELINE_STAGES = [
  SUBMITTED_RESUME_STAGE,
  "Phone screen",
  "Technical interview",
  "Final interview",
  "Offer",
] as const;

export function normalizeSubmissionDate(submissionDate: string): string {
  const parsed = new Date(submissionDate);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid submission date");
  }
  return parsed.toISOString();
}

export function createInitialStageState(submissionDate: string): {
  currentStage: string;
  stageHistory: Record<string, string>;
} {
  const iso = normalizeSubmissionDate(submissionDate);
  return {
    currentStage: SUBMITTED_RESUME_STAGE,
    stageHistory: { [SUBMITTED_RESUME_STAGE]: iso },
  };
}
