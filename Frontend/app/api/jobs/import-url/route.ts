import { createClaudeClient, JobImportAgent } from "@jp/backend";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

export async function POST(request: Request) {
  return proxyOr(request, "/jobs/import-url", () => importLocally(request));
}

async function importLocally(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url?.trim()) {
      return NextResponse.json({ error: "Job URL is required" }, { status: 400 });
    }

    const agent = new JobImportAgent(createClaudeClient());
    const fields = await agent.importFromUrl(body.url);
    return NextResponse.json({ fields });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import job from URL";
    const status =
      message.includes("required") ||
      message.includes("Invalid") ||
      message.includes("Could not") ||
      message.includes("Try filling") ||
      message.includes("Timed out")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
