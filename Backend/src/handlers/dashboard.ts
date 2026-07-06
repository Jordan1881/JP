import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getDashboardStats, mapDashboardError } from "../application/index.js";
import { getUserId } from "./auth.js";
import { getJobRepository } from "../services/store-provider.js";
import { handleLambda } from "./transport.js";

export async function getDashboardHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  return handleLambda(
    async () =>
      getDashboardStats(await getJobRepository(), getUserId(event), {
        status: "all",
        sortOrder: "desc",
      }),
    { mapError: mapDashboardError },
  );
}
