import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { ErrorMapping } from "../application/errors.js";

export const JSON_HEADERS = { "Content-Type": "application/json" };

export function lambdaResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

export async function handleLambda<T>(
  fn: () => Promise<T>,
  options: {
    successStatus?: number;
    mapError: (error: unknown) => ErrorMapping;
  },
): Promise<APIGatewayProxyResult> {
  try {
    const result = await fn();
    return lambdaResponse(options.successStatus ?? 200, result);
  } catch (error) {
    const { statusCode, message } = options.mapError(error);
    return lambdaResponse(statusCode, { error: message });
  }
}

export function requireBody(
  event: APIGatewayProxyEvent,
): string | APIGatewayProxyResult {
  if (!event.body) {
    return lambdaResponse(400, { error: "Request body is required" });
  }
  return event.body;
}
