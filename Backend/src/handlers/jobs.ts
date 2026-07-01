import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { CreateJobInput } from "@jp/shared-types";
import { getUserId } from "./auth.js";
import { getDevJobRepository } from "../modules/job-repository/factory.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode: statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

export async function listJobsHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const repository = getDevJobRepository();
    const jobs = await repository.listActive({ userId: getUserId(event) });
    return response(200, { jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list jobs";
    return response(500, { error: message });
  }
}

export async function createJobHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const input = JSON.parse(event.body) as CreateJobInput;
    const repository = getDevJobRepository();
    const job = await repository.create(getUserId(event), input);
    return response(201, { job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create job";
    const statusCode = message.includes("required") || message.includes("Invalid")
      ? 400
      : 500;
    return response(statusCode, { error: message });
  }
}
