import {
  TERMINAL_STAGES,
  type Job,
  type ListJobsQuery,
  type StageList,
} from "./job.js";

export const SUBMITTED_RESUME_STAGE = "Submitted resume";

export const DEFAULT_PIPELINE_STAGES = [
  SUBMITTED_RESUME_STAGE,
  "Phone screen",
  "Technical interview",
  "Final interview",
  "Offer",
] as const;

export function resolvePipelineStages(stageList?: StageList): string[] {
  const custom = stageList?.filter((stage) => stage.trim().length > 0) ?? [];
  const pipeline = custom.length > 0 ? custom : [...DEFAULT_PIPELINE_STAGES];
  return [...pipeline, ...TERMINAL_STAGES];
}

export function buildStageFilterOptions(
  stageList: StageList | undefined,
  jobs: Job[],
): string[] {
  const pipeline = resolvePipelineStages(stageList);
  const merged = [...pipeline];

  for (const job of jobs) {
    if (!merged.includes(job.currentStage)) {
      merged.push(job.currentStage);
    }
  }

  return merged;
}

export function sortStagesByPipeline(
  stages: string[],
  pipelineOrder: string[],
): string[] {
  return [...stages].sort((left, right) => {
    const leftIndex = pipelineOrder.indexOf(left);
    const rightIndex = pipelineOrder.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  });
}

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

export function searchAndFilterJobs(
  jobs: Job[],
  query: ListJobsQuery = {},
): Job[] {
  let result = [...jobs];
  const status = query.status ?? "active";

  if (status !== "all") {
    result = result.filter((job) => job.status === status);
  }

  if (query.stage?.trim()) {
    const stage = query.stage.trim();
    result = result.filter((job) => job.currentStage === stage);
  }

  const search = query.q?.trim().toLowerCase();
  if (search) {
    result = result.filter((job) => {
      const haystack = [job.title, job.company, job.jobNumber ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  const sortOrder = query.sortOrder ?? "desc";
  result.sort((left, right) => {
    const comparison = left.lastUpdatedAt.localeCompare(right.lastUpdatedAt);
    return sortOrder === "desc" ? -comparison : comparison;
  });

  return result;
}
