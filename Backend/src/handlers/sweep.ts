import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { mapSweepError, runUserSweep } from "../application/index.js";
import {
  getJobRepository,
  getNotificationCenter,
  getUserPreferencesRepository,
} from "../services/store-provider.js";
import { getUserId } from "./auth.js";
import { handleLambda } from "./transport.js";

export async function sweepHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  return handleLambda(async () => {
    const [jobRepository, preferencesRepository, notificationCenter] =
      await Promise.all([
        getJobRepository(),
        getUserPreferencesRepository(),
        getNotificationCenter(),
      ]);

    return runUserSweep(
      { jobRepository, preferencesRepository, notificationCenter },
      getUserId(event),
    );
  }, {
    mapError: mapSweepError,
  });
}
