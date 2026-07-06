import { NextRequest, NextResponse } from "next/server";

/** Legacy Cognito callback URL → canonical OAuth callback page. */
export function GET(request: NextRequest) {
  const target = new URL("/auth/callback", request.url);
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target);
}
