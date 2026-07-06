import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { mapSweepError, runUserSweep } from "../application/index.js";
import { getUserId } from "./auth.js";
import { handleLambda } from "./transport.js";

export async function sweepHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  return handleLambda(async () => runUserSweep(getUserId(event)), {
    mapError: mapSweepError,
  });
}
