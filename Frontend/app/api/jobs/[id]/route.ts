import {
  getDevJobRepository,
  LOCAL_DEV_USER_ID,
} from "@jp/backend";
import type { PatchJobInput } from "@jp/shared-types";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyOr(request, `/jobs/${id}`, async () => {
    try {
      const job = await getDevJobRepository().getById(getUserId(request), id);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json({ job });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load job";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyOr(request, `/jobs/${id}`, async () => {
    try {
      const input = (await request.json()) as PatchJobInput;
      const result = await getDevJobRepository().patch(
        getUserId(request),
        id,
        input,
      );
      return NextResponse.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update job";
      const status =
        message.includes("not found") || message.includes("required")
          ? 400
          : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyOr(request, `/jobs/${id}`, async () => {
    try {
      await getDevJobRepository().deletePermanent(getUserId(request), id);
      return NextResponse.json({ deleted: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete job";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
