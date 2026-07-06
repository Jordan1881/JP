import type { Job } from "@jp/shared-types";
import { archiveJobForTerminalStage } from "../archive-lifecycle-manager/index.js";
import type { TerminalStageEvent } from "../stage-pipeline-manager/index.js";

/** Orchestrates Stage Pipeline Manager output with Archive Lifecycle Manager rules. */
export function applyTerminalStageArchive(
  job: Job,
  event: TerminalStageEvent,
): Job {
  return archiveJobForTerminalStage(job, event.stage, job.lastUpdatedAt);
}
