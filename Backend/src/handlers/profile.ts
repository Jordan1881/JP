import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { UpdateProfileInput } from "@jp/shared-types";
import { getUserId } from "./auth.js";
import {
  AgentUseCaseError,
  createAgentUseCaseDeps,
  profileInterviewTurn,
} from "../application/agents/index.js";
import { getJobRepository, getProfileRepository } from "../services/store-provider.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

async function getAgentUseCaseDeps() {
  const [jobRepository, profileRepository] = await Promise.all([
    getJobRepository(),
    getProfileRepository(),
  ]);
  return createAgentUseCaseDeps({ jobRepository, profileRepository });
}

export async function getProfileHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const profile = await (await getProfileRepository()).get(getUserId(event));
    return response(200, { profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile";
    return response(500, { error: message });
  }
}

export async function updateProfileHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const input = JSON.parse(event.body) as UpdateProfileInput;
    const profile = await (await getProfileRepository()).update(
      getUserId(event),
      input,
    );
    return response(200, { profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    return response(400, { error: message });
  }
}

export async function profileInterviewHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const body = JSON.parse(event.body) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      completedTopics: string[];
      answer?: string;
    };
    const result = await profileInterviewTurn(
      await getAgentUseCaseDeps(),
      getUserId(event),
      body,
    );
    return response(200, result);
  } catch (error) {
    if (error instanceof AgentUseCaseError) {
      return response(error.statusCode, { error: error.message });
    }
    const message =
      error instanceof Error ? error.message : "Profile interview failed";
    return response(500, { error: message });
  }
}
