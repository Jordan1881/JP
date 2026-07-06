import {
  acceptTerms,
  getDevUserAccountRepository,
  mapAccountError,
} from "@jp/backend";
import type { AcceptTermsInput } from "@jp/shared-types";
import { proxyOr } from "@/lib/server/backend-proxy";
import { getLocalUserId } from "@/lib/server/local-user";
import { handleRoute } from "@/lib/server/route-adapter";

export async function POST(request: Request) {
  return proxyOr(request, "/account/accept-terms", async () => {
    const input = (await request.json()) as AcceptTermsInput;
    return handleRoute(
      () =>
        acceptTerms(
          getDevUserAccountRepository(),
          getLocalUserId(request),
          input,
        ),
      { mapError: mapAccountError },
    );
  });
}
