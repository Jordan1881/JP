import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AgentChatMessage } from "@jp/shared-types";
import { getUserId } from "./auth.js";
import { createClaudeClient } from "../modules/claude-api-client/index.js";
import {
  CoverLetterAgent,
  JobAnnouncementAgent,
} from "../modules/generation-agents/index.js";
import { getJobRepository } from "../services/store-provider.js";
import { getProfileRepository } from "../services/store-provider.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

function jobIdFromPath(path: string): string | null {
  const match = path.match(/\/jobs\/([^/]+)\/(cover-letter|announcement)$/);
  return match?.[1] ?? null;
}

async function requireCompleteProfile(userId: string) {
  const repository = (await getProfileRepository());
  const profile = await repository.get(userId);
  if (!repository.isComplete(profile) || !profile) {
    throw new Error("Complete your profile interview before generating content");
  }
  return profile;
}

export async function coverLetterHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const jobId = jobIdFromPath(event.path);
  if (!jobId || !event.body) {
    return response(400, { error: "Job id and body are required" });
  }

  try {
    const userId = getUserId(event);
    const job = await (await getJobRepository()).getById(userId, jobId);
    if (!job) {
      return response(404, { error: "Job not found" });
    }

    const profile = await requireCompleteProfile(userId);
    const body = JSON.parse(event.body) as {
      action: "generate" | "revise";
      instruction?: string;
      messages?: AgentChatMessage[];
    };
    const client = createClaudeClient();
    const agent = new CoverLetterAgent(client);

    const draft =
      body.action === "revise" && job.coverLetter && body.instruction
        ? await agent.revise(job.coverLetter, body.instruction, body.messages ?? [])
        : await agent.generate(job, profile);

    const updated = await (await getJobRepository()).patch(userId, jobId, {
      coverLetter: draft,
    });
    return response(200, { job: updated.job, draft });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cover letter generation failed";
    return response(400, { error: message });
  }
}

export async function announcementHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const jobId = jobIdFromPath(event.path);
  if (!jobId || !event.body) {
    return response(400, { error: "Job id and body are required" });
  }

  try {
    const userId = getUserId(event);
    const job = await (await getJobRepository()).getById(userId, jobId);
    if (!job) {
      return response(404, { error: "Job not found" });
    }
    if (job.currentStage !== "Accepted") {
      return response(400, { error: "Announcement is only available for Accepted jobs" });
    }

    const profile = await requireCompleteProfile(userId);
    const body = JSON.parse(event.body) as {
      action: "generate" | "revise";
      instruction?: string;
      messages?: AgentChatMessage[];
    };
    const client = createClaudeClient();
    const agent = new JobAnnouncementAgent(client);

    const draft =
      body.action === "revise" && job.announcement && body.instruction
        ? await agent.revise(job.announcement, body.instruction, body.messages ?? [])
        : await agent.generate(job, profile);

    const updated = await (await getJobRepository()).patch(userId, jobId, {
      announcement: draft,
    });
    return response(200, { job: updated.job, draft });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Announcement generation failed";
    return response(400, { error: message });
  }
}
