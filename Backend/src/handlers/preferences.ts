import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { UpdateUserPreferencesInput } from "@jp/shared-types";
import { getUserId } from "./auth.js";
import { getUserPreferencesRepository } from "../services/store-provider.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

export async function getPreferencesHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const preferences = await (await getUserPreferencesRepository()).getOrCreate(
      getUserId(event),
    );
    return response(200, { preferences });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load preferences";
    return response(500, { error: message });
  }
}

export async function updatePreferencesHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const input = JSON.parse(event.body) as UpdateUserPreferencesInput;
    const preferences = await (await getUserPreferencesRepository()).update(
      getUserId(event),
      input,
    );
    return response(200, { preferences });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update preferences";
    return response(500, { error: message });
  }
}
