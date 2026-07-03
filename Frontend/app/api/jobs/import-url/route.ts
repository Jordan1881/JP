import { createClaudeClient, JobImportAgent } from "@jp/backend";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

const CLIENT_ERROR_MARKERS = [
  "required",
  "Invalid",
  "Could not",
  "Try pasting",
  "Timed out",
  "blocks automated",
  "Paste more",
  "http or https",
];

export async function POST(request: Request) {
  return proxyOr(request, "/jobs/import-url", () => importLocally(request));
}

async function importLocally(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; text?: string };
    const agent = new JobImportAgent(createClaudeClient());

    let fields;
    if (body.text?.trim()) {
      fields = await agent.importFromText(body.text);
    } else if (body.url?.trim()) {
      fields = await agent.importFromUrl(body.url);
    } else {
      return NextResponse.json(
        { error: "A job URL or pasted text is required" },
        { status: 400 },
      );
    }

    return NextResponse.json({ fields });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import job";
    const status = CLIENT_ERROR_MARKERS.some((marker) =>
      message.includes(marker),
    )
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
