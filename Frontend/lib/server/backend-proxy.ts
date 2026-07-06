import { NextResponse } from "next/server";

/**
 * Production and local dev (ADR-0004): Amplify-hosted Next.js API routes proxy
 * to API Gateway + ApiHandler Lambda. Frontend does not import @jp/backend.
 *
 * JP_API_URL (server-only, preferred) or NEXT_PUBLIC_API_URL, e.g.
 * https://xyz.execute-api.us-east-1.amazonaws.com/v1
 */
function apiBaseUrl(): string | null {
  const base = process.env.JP_API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  return base ? base.replace(/\/+$/, "") : null;
}

export function isBackendConfigured(): boolean {
  return apiBaseUrl() !== null;
}

const FORWARDED_HEADERS = ["content-type", "x-user-id", "authorization"];

const MISSING_API_URL_MESSAGE =
  "JP_API_URL is not configured. Set it in .env.local at the repo root (see docs/infra/deploy-runbook.md).";

export async function proxyToBackend(
  request: Request,
  backendPath: string,
): Promise<NextResponse> {
  const base = apiBaseUrl();
  if (!base) {
    return NextResponse.json({ error: MISSING_API_URL_MESSAGE }, { status: 503 });
  }

  const { search } = new URL(request.url);
  const headers: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers[name] = value;
    }
  }

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.text();

  try {
    const response = await fetch(`${base}${backendPath}${search}`, {
      method,
      headers,
      body: body || undefined,
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backend request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
