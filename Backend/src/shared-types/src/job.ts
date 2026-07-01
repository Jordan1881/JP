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

export type UpdateJobInput = Partial<
  Omit<Job, "id" | "userId" | "submissionDate">
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

export interface UserAccount {
  userId: string;
  name: string;
  email: string;
  photoUrl?: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
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
}
