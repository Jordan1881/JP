import {
  computeDashboardStats,
  getDevJobRepository,
  LOCAL_DEV_USER_ID,
} from "@jp/backend";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function GET(request: Request) {
  return proxyOr(request, "/dashboard", async () => {
    try {
      const jobs = await getDevJobRepository().list(getUserId(request), {
        status: "all",
      });
      return NextResponse.json({ stats: computeDashboardStats(jobs) });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load dashboard";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
