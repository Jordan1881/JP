import {
  createClaudeClient,
  getDevProfileRepository,
  LOCAL_DEV_USER_ID,
  ProfileInterviewAgent,
} from "@jp/backend";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function POST(request: Request) {
  return proxyOr(request, "/profile/interview", () => interviewLocally(request));
}

async function interviewLocally(request: Request) {
  try {
    const userId = getUserId(request);
    const repository = getDevProfileRepository();
    const existing = await repository.get(userId);
    if (repository.isComplete(existing)) {
      return NextResponse.json(
        { error: "Profile interview already completed" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      completedTopics: string[];
      answer?: string;
    };

    const agent = new ProfileInterviewAgent(createClaudeClient());
    const messages = [...body.messages];
    let completedTopics = [...body.completedTopics];

    if (body.answer?.trim()) {
      messages.push({ role: "user", content: body.answer.trim() });
      completedTopics = await agent.updateCompletedTopics(
        messages,
        completedTopics,
      );
    }

    if (agent.isInterviewComplete(completedTopics)) {
      const profile = await repository.saveInterviewProfile(
        userId,
        await agent.buildProfileFromTranscript(messages),
      );
      return NextResponse.json({
        complete: true,
        profile,
        messages: [
          ...messages,
          {
            role: "assistant",
            content:
              "Your profile is saved. You can edit it anytime on the Profile page.",
          },
        ],
        completedTopics,
      });
    }

    const question = await agent.getNextQuestion(messages, completedTopics);
    return NextResponse.json({
      complete: false,
      messages: [...messages, { role: "assistant", content: question }],
      completedTopics,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Profile interview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
