import {
  getDevUserPreferencesRepository,
  getPreferences,
  mapPreferencesError,
  updatePreferences,
} from "@jp/backend";
import type { UpdateUserPreferencesInput } from "@jp/shared-types";
import { proxyOr } from "@/lib/server/backend-proxy";
import { getLocalUserId } from "@/lib/server/local-user";
import { handleRoute } from "@/lib/server/route-adapter";

export async function GET(request: Request) {
  return proxyOr(request, "/preferences", () =>
    handleRoute(
      () =>
        getPreferences(
          getDevUserPreferencesRepository(),
          getLocalUserId(request),
        ),
      { mapError: mapPreferencesError },
    ),
  );
}

export async function PATCH(request: Request) {
  return proxyOr(request, "/preferences", async () => {
    const input = (await request.json()) as UpdateUserPreferencesInput;
    return handleRoute(
      () =>
        updatePreferences(
          getDevUserPreferencesRepository(),
          getLocalUserId(request),
          input,
        ),
      {
        mapError: (error) =>
          mapPreferencesError(error, "Failed to update preferences"),
      },
    );
  });
}
