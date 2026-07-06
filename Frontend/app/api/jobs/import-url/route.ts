import { proxyToBackend } from "@/lib/server/backend-proxy";

export async function POST(request: Request) {
  return proxyToBackend(request, "/jobs/import-url");
}
