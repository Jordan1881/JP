import {
  getDevProfileRepository,
  LOCAL_DEV_USER_ID,
} from "@jp/backend";
import type { UpdateProfileInput } from "@jp/shared-types";
import { NextResponse } from "next/server";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function GET(request: Request) {
  try {
    const profile = await getDevProfileRepository().get(getUserId(request));
    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const input = (await request.json()) as UpdateProfileInput;
    const profile = await getDevProfileRepository().update(
      getUserId(request),
      input,
    );
    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
