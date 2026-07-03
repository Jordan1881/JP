import { NextResponse } from "next/server";

/**
 * Production persistence path (ADR-0004): Amplify-hosted Next.js API routes
 * proxy to the deployed API Gateway + ApiHandler Lambda, which is the only
 * compute that can reach Aurora inside the VPC. When no API base URL is
 * configured (local dev), routes fall back to the in-memory dev stores.
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

const FORWARDED_HEADERS = ["content-type", "x-user-id"];

export async function proxyToBackend(
  request: Request,
  backendPath: string,
): Promise<NextResponse> {
  const base = apiBaseUrl();
  if (!base) {
    throw new Error("Backend API URL is not configured");
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
}

/** Proxy when a backend is configured; otherwise run the local dev fallback. */
export async function proxyOr(
  request: Request,
  backendPath: string,
  fallback: () => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!isBackendConfigured()) {
    return fallback();
  }
  try {
    return await proxyToBackend(request, backendPath);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backend request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
