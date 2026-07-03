import {
  getDevUserPreferencesRepository,
  LOCAL_DEV_USER_ID,
} from "@jp/backend";
import type { UpdateUserPreferencesInput } from "@jp/shared-types";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function GET(request: Request) {
  return proxyOr(request, "/preferences", async () => {
    try {
      const preferences = await getDevUserPreferencesRepository().getOrCreate(
        getUserId(request),
      );
      return NextResponse.json({ preferences });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load preferences";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

export async function PATCH(request: Request) {
  return proxyOr(request, "/preferences", async () => {
    try {
      const input = (await request.json()) as UpdateUserPreferencesInput;
      const preferences = await getDevUserPreferencesRepository().update(
        getUserId(request),
        input,
      );
      return NextResponse.json({ preferences });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update preferences";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
