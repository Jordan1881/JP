import { getDevJobRepository, LOCAL_DEV_USER_ID } from "@jp/backend";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyOr(request, `/jobs/${id}/restore`, async () => {
    try {
      const job = await getDevJobRepository().restore(getUserId(request), id);
      return NextResponse.json({ job });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to restore job";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
