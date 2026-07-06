import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AgentChatMessage } from "@jp/shared-types";
import { getUserId } from "./auth.js";
import {
  AgentUseCaseError,
  announcementWorkflow,
  coverLetterWorkflow,
  createAgentUseCaseDeps,
} from "../application/agents/index.js";
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

async function getAgentUseCaseDeps() {
  const [jobRepository, profileRepository] = await Promise.all([
    getJobRepository(),
    getProfileRepository(),
  ]);
  return createAgentUseCaseDeps({ jobRepository, profileRepository });
}

function handleUseCaseError(
  error: unknown,
  fallbackMessage: string,
): APIGatewayProxyResult {
  if (error instanceof AgentUseCaseError) {
    return response(error.statusCode, { error: error.message });
  }
  const message = error instanceof Error ? error.message : fallbackMessage;
  return response(400, { error: message });
}

export async function coverLetterHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const jobId = jobIdFromPath(event.path);
  if (!jobId || !event.body) {
    return response(400, { error: "Job id and body are required" });
  }

  try {
    const body = JSON.parse(event.body) as {
      action: "generate" | "revise";
      instruction?: string;
      messages?: AgentChatMessage[];
    };
    const result = await coverLetterWorkflow(
      await getAgentUseCaseDeps(),
      getUserId(event),
      jobId,
      body,
    );
    return response(200, result);
  } catch (error) {
    return handleUseCaseError(error, "Cover letter generation failed");
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
    const body = JSON.parse(event.body) as {
      action: "generate" | "revise";
      instruction?: string;
      messages?: AgentChatMessage[];
    };
    const result = await announcementWorkflow(
      await getAgentUseCaseDeps(),
      getUserId(event),
      jobId,
      body,
    );
    return response(200, result);
  } catch (error) {
    return handleUseCaseError(error, "Announcement generation failed");
  }
}
