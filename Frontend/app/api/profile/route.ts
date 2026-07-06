import { proxyToBackend } from "@/lib/server/backend-proxy";

export async function GET(request: Request) {
  return proxyToBackend(request, "/profile");
}

export async function PATCH(request: Request) {
  return proxyToBackend(request, "/profile");
}
