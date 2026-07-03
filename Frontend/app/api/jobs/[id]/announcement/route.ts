import {
  createClaudeClient,
  getDevJobRepository,
  getDevProfileRepository,
  JobAnnouncementAgent,
  LOCAL_DEV_USER_ID,
} from "@jp/backend";
import type { AgentChatMessage } from "@jp/shared-types";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyOr(request, `/jobs/${id}/announcement`, async () => {
    try {
      const userId = getUserId(request);
      const job = await getDevJobRepository().getById(userId, id);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      if (job.currentStage !== "Accepted") {
        return NextResponse.json(
          { error: "Announcement is only available for Accepted jobs" },
          { status: 400 },
        );
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
      const agent = new JobAnnouncementAgent(createClaudeClient());
      const draft =
        body.action === "revise" && job.announcement && body.instruction
          ? await agent.revise(job.announcement, body.instruction, body.messages ?? [])
          : await agent.generate(job, profile);
      const result = await getDevJobRepository().patch(userId, id, {
        announcement: draft,
      });
      return NextResponse.json({ job: result.job, draft });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Announcement generation failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
