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
  return proxyOr(request, `/jobs/${id}/archive`, async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as {
        reason?: string;
      };
      const repository = getDevJobRepository();
      const userId = getUserId(request);
      const job =
        body.reason === "no_response"
          ? await repository.archiveNoResponse(userId, id)
          : await repository.archiveManual(userId, id);
      return NextResponse.json({ job });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to archive job";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
