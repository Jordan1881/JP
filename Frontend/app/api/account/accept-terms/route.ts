import {
  getDevUserAccountRepository,
  LOCAL_DEV_USER_ID,
} from "@jp/backend";
import type { AcceptTermsInput } from "@jp/shared-types";
import { NextResponse } from "next/server";
import { proxyOr } from "@/lib/server/backend-proxy";

function getUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}

export async function POST(request: Request) {
  return proxyOr(request, "/account/accept-terms", async () => {
    try {
      const input = (await request.json()) as AcceptTermsInput;
      const account = await getDevUserAccountRepository().acceptTerms(
        getUserId(request),
        input,
      );
      return NextResponse.json({ account });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to accept terms";
      const status = message.includes("must be") || message.includes("not found")
        ? 400
        : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
