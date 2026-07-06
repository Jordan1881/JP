import {
  createAccount,
  deleteAccount,
  getAccount,
  getDevUserAccountRepository,
  mapAccountError,
  updateAccount,
} from "@jp/backend";
import type {
  CreateAccountInput,
  DeleteAccountInput,
  UpdateAccountInput,
} from "@jp/shared-types";
import { proxyOr } from "@/lib/server/backend-proxy";
import { getLocalUserId } from "@/lib/server/local-user";
import { handleRoute } from "@/lib/server/route-adapter";

export async function GET(request: Request) {
  return proxyOr(request, "/account", () =>
    handleRoute(
      () =>
        getAccount(getDevUserAccountRepository(), getLocalUserId(request)),
      { mapError: mapAccountError },
    ),
  );
}

export async function POST(request: Request) {
  return proxyOr(request, "/account", async () => {
    const input = (await request.json()) as CreateAccountInput;
    return handleRoute(
      () =>
        createAccount(
          getDevUserAccountRepository(),
          getLocalUserId(request),
          input,
        ),
      { status: 201, mapError: mapAccountError },
    );
  });
}

export async function PATCH(request: Request) {
  return proxyOr(request, "/account", async () => {
    const input = (await request.json()) as UpdateAccountInput;
    return handleRoute(
      () =>
        updateAccount(
          getDevUserAccountRepository(),
          getLocalUserId(request),
          input,
        ),
      { mapError: mapAccountError },
    );
  });
}

export async function DELETE(request: Request) {
  return proxyOr(request, "/account", async () => {
    const input = (await request.json()) as DeleteAccountInput;
    return handleRoute(
      () =>
        deleteAccount(
          getDevUserAccountRepository(),
          getLocalUserId(request),
          input,
        ),
      { mapError: mapAccountError },
    );
  });
}
