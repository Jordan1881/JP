import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { UpdateProfileInput } from "@jp/shared-types";
import { getUserId } from "./auth.js";
import { createClaudeClient } from "../modules/claude-api-client/index.js";
import { ProfileInterviewAgent } from "../modules/profile-interview-agent/index.js";
import { getProfileRepository } from "../services/store-provider.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
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
    const userId = getUserId(event);
    const repository = (await getProfileRepository());
    const existing = await repository.get(userId);
    if (repository.isComplete(existing)) {
      return response(400, { error: "Profile interview already completed" });
    }

    const body = JSON.parse(event.body) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      completedTopics: string[];
      answer?: string;
    };

    const agent = new ProfileInterviewAgent(createClaudeClient());
    const messages = [...body.messages];
    let completedTopics = [...body.completedTopics];

    if (body.answer?.trim()) {
      messages.push({ role: "user", content: body.answer.trim() });
      completedTopics = await agent.updateCompletedTopics(
        messages,
        completedTopics,
      );
    }

    if (agent.isInterviewComplete(completedTopics)) {
      const profile = await repository.saveInterviewProfile(
        userId,
        await agent.buildProfileFromTranscript(messages),
      );
      return response(200, {
        complete: true,
        profile,
        messages: [
          ...messages,
          {
            role: "assistant",
            content: "Your profile is saved. You can edit it anytime on the Profile page.",
          },
        ],
        completedTopics,
      });
    }

    const question = await agent.getNextQuestion(messages, completedTopics);
    const nextMessages = [...messages, { role: "assistant" as const, content: question }];
    return response(200, {
      complete: false,
      messages: nextMessages,
      completedTopics,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Profile interview failed";
    return response(500, { error: message });
  }
}
