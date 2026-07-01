import { getDevNotificationCenter, LOCAL_DEV_USER_ID } from "@jp/backend";
import { NextResponse } from "next/server";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function POST(request: Request) {
  try {
    await getDevNotificationCenter().markAllRead(getUserId(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
