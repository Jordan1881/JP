export {
  JobRepository,
  InMemoryJobStore,
  createJobRepository,
  getDevJobRepository,
  getDevJobStore,
} from "./modules/job-repository/index.js";
export {
  getDisplayStages,
  resolvePipelineStages,
  applyStageChange,
  SUBMITTED_RESUME_STAGE,
  DEFAULT_PIPELINE_STAGES,
} from "./modules/stage-pipeline-manager/index.js";
export type {
  TerminalStageEvent,
  StageChangeResult,
} from "./modules/stage-pipeline-manager/index.js";
export {
  UserAccountRepository,
  InMemoryUserAccountStore,
  createUserAccountRepository,
  getDevUserAccountRepository,
} from "./modules/user-account/index.js";
export type { UserAccountStore } from "./modules/user-account/index.js";
export { searchAndFilterJobs } from "./modules/search-filter-engine/index.js";
export {
  archiveJob,
  restoreJob,
  isEligibleForDeletion,
  isStaleActiveJob,
} from "./modules/archive-lifecycle-manager/index.js";
export {
  NotificationCenter,
  InMemoryNotificationStore,
  getDevNotificationCenter,
} from "./modules/notification-center/index.js";
export { runStalenessSweep } from "./modules/staleness-scheduler/index.js";
export { computeDashboardStats } from "./modules/dashboard-analytics/index.js";
export {
  UserPreferencesRepository,
  getDevUserPreferencesRepository,
} from "./modules/user-preferences/index.js";
export {
  ProfileRepository,
  getDevProfileRepository,
} from "./modules/profile-repository/index.js";
export { createClaudeClient } from "./modules/claude-api-client/index.js";
export { ProfileInterviewAgent } from "./modules/profile-interview-agent/index.js";
export {
  CoverLetterAgent,
  JobAnnouncementAgent,
} from "./modules/generation-agents/index.js";
export { runDailySweep } from "./services/sweep-service.js";

export const LOCAL_DEV_USER_ID = "local-dev-user";

export type {
  JobStore,
  ListActiveJobsParams,
} from "./modules/job-repository/index.js";
