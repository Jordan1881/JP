import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { ListJobsQuery } from "@jp/shared-types";
import {
  archiveJob,
  createJob,
  deleteJob,
  getJob,
  importJob,
  listJobs,
  patchJob,
  restoreJob,
} from "../application/jobs/index.js";
import { getUserId } from "./auth.js";
import { createClaudeClient } from "../modules/claude-api-client/index.js";
import { JobImportAgent } from "../modules/job-import-agent/index.js";
import { getJobRepository } from "../services/store-provider.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

function jobIdFromPath(path: string): string | null {
  const match = path.match(/\/jobs\/([^/]+)$/);
  return match?.[1] ?? null;
}

function listQuery(event: APIGatewayProxyEvent): ListJobsQuery {
  const params = event.queryStringParameters ?? {};
  return {
    q: params.q,
    stage: params.stage,
    status: (params.status as ListJobsQuery["status"]) ?? "active",
    sortOrder: params.sortOrder === "asc" ? "asc" : "desc",
  };
}

const IMPORT_CLIENT_ERROR_MARKERS = [
  "required",
  "Invalid",
  "Could not",
  "Try pasting",
  "Timed out",
  "too large",
  "not look like",
  "blocks automated",
  "Paste more",
  "http or https",
];

export async function listJobsHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const jobs = await listJobs(
      getUserId(event),
      listQuery(event),
      await getJobRepository(),
    );
    return response(200, { jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list jobs";
    return response(500, { error: message });
  }
}

export async function importJobFromUrlHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const body = JSON.parse(event.body) as { url?: string; text?: string };
    const agent = new JobImportAgent(createClaudeClient());
    const fields = await importJob(body, agent);
    return response(200, { fields });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import job";
    const statusCode = IMPORT_CLIENT_ERROR_MARKERS.some((marker) =>
      message.includes(marker),
    )
      ? 400
      : 500;
    return response(statusCode, { error: message });
  }
}

export async function createJobHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const input = JSON.parse(event.body);
    const job = await createJob(
      getUserId(event),
      input,
      await getJobRepository(),
    );
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
    const job = await getJob(getUserId(event), jobId, await getJobRepository());
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
    const input = JSON.parse(event.body);
    const result = await patchJob(
      getUserId(event),
      jobId,
      input,
      await getJobRepository(),
    );
    return response(200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update job";
    const statusCode =
      message.includes("not found") || message.includes("required") ? 400 : 500;
    return response(statusCode, { error: message });
  }
}

export async function deleteJobHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const jobId = jobIdFromPath(event.path);
  if (!jobId) {
    return response(400, { error: "Job id is required" });
  }

  try {
    await deleteJob(getUserId(event), jobId, await getJobRepository());
    return response(200, { deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete job";
    return response(message.includes("not found") ? 400 : 500, { error: message });
  }
}

export async function archiveJobHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const jobId = jobIdFromPath(event.path.replace(/\/archive$/, ""));
  if (!jobId) {
    return response(400, { error: "Job id is required" });
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const job = await archiveJob(
      getUserId(event),
      jobId,
      body,
      await getJobRepository(),
    );
    return response(200, { job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to archive job";
    return response(message.includes("not found") ? 400 : 500, { error: message });
  }
}

export async function restoreJobHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const jobId = jobIdFromPath(event.path.replace(/\/restore$/, ""));
  if (!jobId) {
    return response(400, { error: "Job id is required" });
  }

  try {
    const job = await restoreJob(
      getUserId(event),
      jobId,
      await getJobRepository(),
    );
    return response(200, { job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restore job";
    return response(message.includes("not found") ? 400 : 500, { error: message });
  }
}
