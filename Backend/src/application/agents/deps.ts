import { createClaudeClient } from "../../modules/claude-api-client/index.js";
import {
  CoverLetterAgent,
  JobAnnouncementAgent,
} from "../../modules/generation-agents/index.js";
import { ProfileInterviewAgent } from "../../modules/profile-interview-agent/index.js";
import type { JobRepository } from "../../modules/job-repository/index.js";
import type { ProfileRepository } from "../../modules/profile-repository/index.js";

export interface AgentUseCaseDeps {
  jobRepository: JobRepository;
  profileRepository: ProfileRepository;
  createCoverLetterAgent: () => CoverLetterAgent;
  createAnnouncementAgent: () => JobAnnouncementAgent;
  createProfileInterviewAgent: () => ProfileInterviewAgent;
}

export function createAgentUseCaseDeps(repositories: {
  jobRepository: JobRepository;
  profileRepository: ProfileRepository;
}): AgentUseCaseDeps {
  return {
    jobRepository: repositories.jobRepository,
    profileRepository: repositories.profileRepository,
    createCoverLetterAgent: () => new CoverLetterAgent(createClaudeClient()),
    createAnnouncementAgent: () => new JobAnnouncementAgent(createClaudeClient()),
    createProfileInterviewAgent: () =>
      new ProfileInterviewAgent(createClaudeClient()),
  };
}
