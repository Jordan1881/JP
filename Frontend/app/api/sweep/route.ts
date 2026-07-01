import { runDailySweep, LOCAL_DEV_USER_ID } from "@jp/backend";
import { NextResponse } from "next/server";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function POST(request: Request) {
  try {
    const result = await runDailySweep(getUserId(request));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sweep failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
