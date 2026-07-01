import { NextResponse } from "next/server";
import type { CreateJobInput } from "@jp/shared-types";
import {
  getDevJobRepository,
  LOCAL_DEV_USER_ID,
} from "@jp/backend";

export async function GET() {
  try {
    const jobs = await getDevJobRepository().listActive({
      userId: LOCAL_DEV_USER_ID,
    });
    return NextResponse.json({ jobs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CreateJobInput;
    const job = await getDevJobRepository().create(
      LOCAL_DEV_USER_ID,
      input,
    );
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create job";
    const status = message.includes("required") || message.includes("Invalid")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
