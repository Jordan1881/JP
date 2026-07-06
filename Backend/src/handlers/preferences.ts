import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { UpdateUserPreferencesInput } from "@jp/shared-types";
import {
  getPreferences,
  mapPreferencesError,
  updatePreferences,
} from "../application/index.js";
import { getUserId } from "./auth.js";
import { getUserPreferencesRepository } from "../services/store-provider.js";
import { handleLambda, requireBody } from "./transport.js";

export async function getPreferencesHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  return handleLambda(
    async () =>
      getPreferences(await getUserPreferencesRepository(), getUserId(event)),
    { mapError: mapPreferencesError },
  );
}

export async function updatePreferencesHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const body = requireBody(event);
  if (typeof body !== "string") {
    return body;
  }

  const input = JSON.parse(body) as UpdateUserPreferencesInput;
  return handleLambda(
    async () =>
      updatePreferences(
        await getUserPreferencesRepository(),
        getUserId(event),
        input,
      ),
    {
      mapError: (error) =>
        mapPreferencesError(error, "Failed to update preferences"),
    },
  );
}
