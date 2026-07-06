import {
  buildStageFilterOptions,
  getDisplayStages,
  resolvePipelineStages,
  TERMINAL_STAGES,
  type Job,
  type StageList,
  type TerminalStage,
} from "@jp/shared-types";

export { buildStageFilterOptions, getDisplayStages, resolvePipelineStages };

export function assertStageInPipeline(stage: string, stageList: StageList): void {
  const allowed = resolvePipelineStages(stageList);
  if (!allowed.includes(stage)) {
    throw new Error(`Unknown stage: ${stage}`);
  }
}

export interface TerminalStageEvent {
  jobId: string;
  userId: string;
  stage: TerminalStage;
}

export interface StageChangeResult {
  job: Job;
  terminalStageEvent?: TerminalStageEvent;
}

function isTerminalStage(stage: string): stage is TerminalStage {
  return (TERMINAL_STAGES as readonly string[]).includes(stage);
}

export function applyStageChange(
  job: Job,
  nextStage: string,
  now: string = new Date().toISOString(),
  stageList?: StageList,
): StageChangeResult {
  const stage = nextStage.trim();
  if (!stage) {
    throw new Error("Stage is required");
  }

  if (stageList !== undefined) {
    assertStageInPipeline(stage, stageList);
  }

  const updatedJob: Job = {
    ...job,
    currentStage: stage,
    stageHistory: {
      ...job.stageHistory,
      [stage]: now,
    },
    lastUpdatedAt: now,
  };

  const terminalStageEvent = isTerminalStage(stage)
    ? { jobId: job.id, userId: job.userId, stage }
    : undefined;

  return { job: updatedJob, terminalStageEvent };
}
