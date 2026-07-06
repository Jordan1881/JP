import { proxyToBackend } from "@/lib/server/backend-proxy";

export async function GET(request: Request) {
  return proxyToBackend(request, "/account");
}

export async function POST(request: Request) {
  return proxyToBackend(request, "/account");
}

export async function PATCH(request: Request) {
  return proxyToBackend(request, "/account");
}

export async function DELETE(request: Request) {
  return proxyToBackend(request, "/account");
}
