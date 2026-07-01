import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler as healthHandler } from "../handlers/health.js";

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (event.path === "/health" || event.resource === "/health") {
    return healthHandler();
  }

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Not found" }),
  };
}
