import {
  getDevNotificationCenter,
  mapNotificationsError,
  markNotificationRead,
} from "@jp/backend";
import { proxyOr } from "@/lib/server/backend-proxy";
import { getLocalUserId } from "@/lib/server/local-user";
import { handleRoute } from "@/lib/server/route-adapter";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyOr(request, `/notifications/${id}/read`, () =>
    handleRoute(
      () =>
        markNotificationRead(
          getDevNotificationCenter(),
          getLocalUserId(request),
          id,
        ),
      {
        mapError: (error) =>
          mapNotificationsError(error, "Failed to update notification", 400),
      },
    ),
  );
}
