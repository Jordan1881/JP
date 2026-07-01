import {
  createClaudeClient,
  CoverLetterAgent,
  getDevJobRepository,
  getDevProfileRepository,
  LOCAL_DEV_USER_ID,
} from "@jp/backend";
import type { AgentChatMessage } from "@jp/shared-types";
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
    const userId = getUserId(request);
    const job = await getDevJobRepository().getById(userId, id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const profileRepo = getDevProfileRepository();
    const profile = await profileRepo.get(userId);
    if (!profileRepo.isComplete(profile) || !profile) {
      return NextResponse.json(
        { error: "Complete your profile interview before generating content" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      action: "generate" | "revise";
      instruction?: string;
      messages?: AgentChatMessage[];
    };
    const agent = new CoverLetterAgent(createClaudeClient());
    const draft =
      body.action === "revise" && job.coverLetter && body.instruction
        ? await agent.revise(job.coverLetter, body.instruction, body.messages ?? [])
        : await agent.generate(job, profile);
    const result = await getDevJobRepository().patch(userId, id, {
      coverLetter: draft,
    });
    return NextResponse.json({ job: result.job, draft });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cover letter generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
