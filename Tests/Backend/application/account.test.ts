import { describe, expect, it } from "vitest";
import {
  ApplicationError,
  createAccount,
  deleteAccount,
  getAccount,
} from "@backend/application/index.js";
import { InMemoryUserAccountStore } from "@backend/modules/user-account/in-memory-store.js";
import { UserAccountRepository } from "@backend/modules/user-account/user-account.js";
import { CURRENT_TERMS_VERSION } from "@jp/shared-types";

function repository(): UserAccountRepository {
  return new UserAccountRepository(new InMemoryUserAccountStore());
}

describe("account application", () => {
  it("getAccount throws 404 when missing", async () => {
    await expect(getAccount(repository(), "missing")).rejects.toMatchObject({
      statusCode: 404,
      message: "Account not found",
    });
  });

  it("createAccount and getAccount round-trip", async () => {
    const repo = repository();
    const userId = "user-1";
    const created = await createAccount(repo, userId, {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });
    expect(created.account.name).toBe("Jordan");

    const loaded = await getAccount(repo, userId);
    expect(loaded.account.email).toBe("jordan@example.com");
  });

  it("deleteAccount requires confirmation", async () => {
    const repo = repository();
    const userId = "user-2";
    await createAccount(repo, userId, {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });

    await expect(
      deleteAccount(repo, userId, { confirm: false as unknown as true }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
