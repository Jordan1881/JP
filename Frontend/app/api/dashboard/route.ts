import {
  getDashboardStats,
  getDevJobRepository,
  mapDashboardError,
} from "@jp/backend";
import { proxyOr } from "@/lib/server/backend-proxy";
import { getLocalUserId } from "@/lib/server/local-user";
import { handleRoute } from "@/lib/server/route-adapter";

export async function GET(request: Request) {
  return proxyOr(request, "/dashboard", () =>
    handleRoute(
      () =>
        getDashboardStats(getDevJobRepository(), getLocalUserId(request), {
          status: "all",
          sortOrder: "desc",
        }),
      { mapError: mapDashboardError },
    ),
  );
}
