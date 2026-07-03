import { getDevNotificationCenter, LOCAL_DEV_USER_ID } from "@jp/backend";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function GET(request: Request) {
  return proxyOr(request, "/notifications", async () => {
    try {
      const userId = getUserId(request);
      const center = getDevNotificationCenter();
      const [notifications, unreadCount] = await Promise.all([
        center.list(userId),
        center.unreadCount(userId),
      ]);
      return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load notifications";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
