import { proxyToBackend } from "@/lib/server/backend-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyToBackend(request, `/notifications/${id}/read`);
}
