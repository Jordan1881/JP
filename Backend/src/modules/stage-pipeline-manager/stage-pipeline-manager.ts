import {
  TERMINAL_STAGES,
  type Job,
  type StageList,
  type TerminalStage,
} from "@jp/shared-types";
import { DEFAULT_PIPELINE_STAGES } from "./defaults.js";

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

export function resolvePipelineStages(stageList?: StageList): string[] {
  const custom = stageList?.filter((stage) => stage.trim().length > 0) ?? [];
  const pipeline = custom.length > 0 ? custom : [...DEFAULT_PIPELINE_STAGES];
  return [...pipeline, ...TERMINAL_STAGES];
}

/** Stages shown in the UI: pipeline defaults/custom list plus any visited stages. */
export function getDisplayStages(job: Job, stageList?: StageList): string[] {
  const pipeline = resolvePipelineStages(stageList);
  const visited = Object.keys(job.stageHistory);
  const merged = [...pipeline];

  for (const stage of visited) {
    if (!merged.includes(stage)) {
      merged.push(stage);
    }
  }

  for (const terminal of TERMINAL_STAGES) {
    if (!merged.includes(terminal)) {
      merged.push(terminal);
    }
  }

  return merged;
}

export function applyStageChange(
  job: Job,
  nextStage: string,
  now: string = new Date().toISOString(),
): StageChangeResult {
  const stage = nextStage.trim();
  if (!stage) {
    throw new Error("Stage is required");
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
