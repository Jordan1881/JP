import { getDevNotificationCenter, LOCAL_DEV_USER_ID } from "@jp/backend";
import { NextResponse } from "next/server";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const notification = await getDevNotificationCenter().markRead(
      getUserId(request),
      id,
    );
    return NextResponse.json({ notification });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update notification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
