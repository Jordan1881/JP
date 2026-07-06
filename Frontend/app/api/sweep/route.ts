import { mapSweepError, runUserSweep } from "@jp/backend";
import { proxyOr } from "@/lib/server/backend-proxy";
import { getLocalUserId } from "@/lib/server/local-user";
import { handleRoute } from "@/lib/server/route-adapter";

export async function POST(request: Request) {
  return proxyOr(request, "/sweep", () =>
    handleRoute(() => runUserSweep(getLocalUserId(request)), {
      mapError: mapSweepError,
    }),
  );
}
