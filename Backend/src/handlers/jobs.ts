import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { CreateJobInput, PatchJobInput } from "@jp/shared-types";
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

function jobIdFromPath(path: string): string | null {
  const match = path.match(/\/jobs\/([^/]+)$/);
  return match?.[1] ?? null;
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

export async function getJobHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const jobId = jobIdFromPath(event.path);
  if (!jobId) {
    return response(400, { error: "Job id is required" });
  }

  try {
    const repository = getDevJobRepository();
    const job = await repository.getById(getUserId(event), jobId);
    if (!job) {
      return response(404, { error: "Job not found" });
    }
    return response(200, { job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load job";
    return response(500, { error: message });
  }
}

export async function patchJobHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const jobId = jobIdFromPath(event.path);
  if (!jobId) {
    return response(400, { error: "Job id is required" });
  }
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const input = JSON.parse(event.body) as PatchJobInput;
    const repository = getDevJobRepository();
    const result = await repository.patch(getUserId(event), jobId, input);
    return response(200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update job";
    const statusCode =
      message.includes("not found") || message.includes("required") ? 400 : 500;
    return response(statusCode, { error: message });
  }
}
