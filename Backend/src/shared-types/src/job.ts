/** Fixed terminal stages — always available regardless of custom stage list. */
export const TERMINAL_STAGES = ["Accepted", "Rejected"] as const;
export type TerminalStage = (typeof TERMINAL_STAGES)[number];

export type JobStatus = "active" | "archived";

export type ArchiveReason = "manual" | "no_response" | "accepted" | "rejected";

/** Per-user customizable pipeline stages (excluding terminal stages). */
export type StageList = string[];

/** Stage name → ISO 8601 timestamp of when that stage was entered. */
export type StageHistory = Record<string, string>;

export interface Job {
  id: string;
  userId: string;
  title: string;
  company: string;
  jobNumber?: string;
  url?: string;
  description?: string;
  notes?: string;
  /** Also serves as the "Submitted resume" stage timestamp. */
  submissionDate: string;
  currentStage: string;
  stageHistory: StageHistory;
  status: JobStatus;
  archiveReason?: ArchiveReason;
  archivedAt?: string;
  lastUpdatedAt: string;
  coverLetter?: string;
  announcement?: string;
}

export type CreateJobInput = Pick<
  Job,
  "title" | "company" | "submissionDate"
> &
  Partial<
    Pick<
      Job,
      | "jobNumber"
      | "url"
      | "description"
      | "notes"
      | "currentStage"
      | "stageHistory"
    >
  >;

/**
 * Import request: either a posting URL (server fetches it) or pasted job text
 * (for bot-protected sites like LinkedIn / defense contractors). At least one
 * is required; `url` is still stored on the job when provided.
 */
export interface JobImportInput {
  url?: string;
  text?: string;
}

export type JobImportResult = Pick<CreateJobInput, "title" | "company"> &
  Partial<Pick<CreateJobInput, "url" | "jobNumber" | "description" | "notes">>;

export type UpdateJobInput = Partial<
  Omit<Job, "id" | "userId" | "submissionDate">
>;

export type PatchJobInput = {
  notes?: string;
  stage?: string;
  coverLetter?: string;
  announcement?: string;
};

export type ListJobsQuery = {
  q?: string;
  stage?: string;
  status?: JobStatus | "all";
  sortOrder?: "asc" | "desc";
};

export type UpdateUserPreferencesInput = Partial<
  Omit<UserPreferences, "userId">
>;

export type UpdateProfileInput = Partial<
  Omit<CareerProfile, "userId" | "interviewCompletedAt">
>;

export interface CareerProfile {
  userId: string;
  techStack: string[];
  targetRoles: string[];
  seniority: string;
  yearsOfExperience: number;
  locationPreference: string;
  remotePreference: string;
  salaryExpectations: string;
  notableProjects: string;
  softSkills: string;
  careerNarrative: string;
  interviewCompletedAt?: string;
}

export interface UserPreferences {
  userId: string;
  staleNotificationsEnabled: boolean;
  preDeletionWarningsEnabled: boolean;
  stageList: StageList;
}

export interface DashboardStats {
  totalApplied: number;
  totalAccepted: number;
  totalRejected: number;
  totalNoResponse: number;
  activeByStage: Record<string, number>;
}

export interface ApiHealthResponse {
  status: "ok";
  service: "jp-job-player";
  /** Only reported by deployed environments; absent means not checked. */
  database?: "connected" | "not_configured" | "error";
}
