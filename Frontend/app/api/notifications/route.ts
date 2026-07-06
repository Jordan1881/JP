import {
  getDevNotificationCenter,
  listNotifications,
  mapNotificationsError,
} from "@jp/backend";
import { proxyOr } from "@/lib/server/backend-proxy";
import { getLocalUserId } from "@/lib/server/local-user";
import { handleRoute } from "@/lib/server/route-adapter";

export async function GET(request: Request) {
  return proxyOr(request, "/notifications", () =>
    handleRoute(
      () =>
        listNotifications(getDevNotificationCenter(), getLocalUserId(request)),
      {
        mapError: (error) =>
          mapNotificationsError(error, "Failed to load notifications"),
      },
    ),
  );
}
