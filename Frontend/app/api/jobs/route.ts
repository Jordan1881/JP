import {
  getDevJobRepository,
  LOCAL_DEV_USER_ID,
} from "@jp/backend";
import type { CreateJobInput, ListJobsQuery } from "@jp/shared-types";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

function listQuery(request: Request): ListJobsQuery {
  const { searchParams } = new URL(request.url);
  return {
    q: searchParams.get("q") ?? undefined,
    stage: searchParams.get("stage") ?? undefined,
    status: (searchParams.get("status") as ListJobsQuery["status"]) ?? "active",
    sortOrder: searchParams.get("sortOrder") === "asc" ? "asc" : "desc",
  };
}

export async function GET(request: Request) {
  return proxyOr(request, "/jobs", async () => {
    try {
      const jobs = await getDevJobRepository().list(
        getUserId(request),
        listQuery(request),
      );
      return NextResponse.json({ jobs });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to list jobs";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function POST(request: Request) {
  return proxyOr(request, "/jobs", async () => {
    try {
      const input = (await request.json()) as CreateJobInput;
      const job = await getDevJobRepository().create(getUserId(request), input);
      return NextResponse.json({ job }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create job";
      const status =
        message.includes("required") || message.includes("Invalid") ? 400 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
