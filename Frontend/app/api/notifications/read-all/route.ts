import {
  getDevNotificationCenter,
  mapNotificationsError,
  markAllNotificationsRead,
} from "@jp/backend";
import { proxyOr } from "@/lib/server/backend-proxy";
import { getLocalUserId } from "@/lib/server/local-user";
import { handleRoute } from "@/lib/server/route-adapter";

export async function POST(request: Request) {
  return proxyOr(request, "/notifications/read-all", () =>
    handleRoute(
      () =>
        markAllNotificationsRead(
          getDevNotificationCenter(),
          getLocalUserId(request),
        ),
      {
        mapError: (error) =>
          mapNotificationsError(error, "Failed to update notifications"),
      },
    ),
  );
}
