import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getUserId } from "./auth.js";
import { runDailySweep } from "../services/sweep-service.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

export async function sweepHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const result = await runDailySweep(getUserId(event));
    return response(200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sweep failed";
    return response(500, { error: message });
  }
}
