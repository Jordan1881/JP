import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getUserId } from "./auth.js";
import { computeDashboardStats } from "../modules/dashboard-analytics/index.js";
import { getJobRepository } from "../services/store-provider.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

export async function getDashboardHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const jobs = await (await getJobRepository()).list(getUserId(event), {
      status: "all",
    });
    const stats = computeDashboardStats(jobs);
    return response(200, { stats });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard";
    return response(500, { error: message });
  }
}
