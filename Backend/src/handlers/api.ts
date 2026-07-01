import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler as healthHandler } from "../handlers/health.js";
import {
  createJobHandler,
  listJobsHandler,
} from "../handlers/jobs.js";

function routeKey(event: APIGatewayProxyEvent): string {
  const method = event.httpMethod.toUpperCase();
  const path = event.path.replace(/\/+$/, "") || "/";
  return `${method} ${path}`;
}

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  switch (routeKey(event)) {
    case "GET /health":
      return healthHandler();
    case "GET /jobs":
      return listJobsHandler(event);
    case "POST /jobs":
      return createJobHandler(event);
    default:
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Not found" }),
      };
  }
}
