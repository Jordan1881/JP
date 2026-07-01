import type {
  AcceptTermsInput,
  CreateAccountInput,
  UpdateAccountInput,
  UserAccount,
} from "@jp/shared-types";
import { CURRENT_TERMS_VERSION as TERMS_VERSION } from "@jp/shared-types";
import type { JobStore } from "../job-repository/types.js";
import type { UserAccountStore } from "./types.js";

function optionalTrim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export class UserAccountRepository {
  constructor(
    private readonly store: UserAccountStore,
    private readonly jobStore?: JobStore,
  ) {}

  async get(userId: string): Promise<UserAccount | null> {
    return this.store.findByUserId(userId);
  }

  async create(
    userId: string,
    input: CreateAccountInput,
  ): Promise<UserAccount> {
    const existing = await this.store.findByUserId(userId);
    if (existing) {
      throw new Error("Account already exists");
    }

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();

    if (!name) {
      throw new Error("Name is required");
    }
    if (!email) {
      throw new Error("Email is required");
    }
    if (input.termsVersion !== TERMS_VERSION) {
      throw new Error(`Terms version must be ${TERMS_VERSION}`);
    }

    const now = new Date().toISOString();
    const account: UserAccount = {
      userId,
      name,
      email,
      termsAcceptedAt: now,
      termsVersion: input.termsVersion,
    };

    return this.store.save(account);
  }

  async update(userId: string, input: UpdateAccountInput): Promise<UserAccount> {
    const account = await this.store.findByUserId(userId);
    if (!account) {
      throw new Error("Account not found");
    }

    const name = input.name !== undefined ? input.name.trim() : account.name;
    if (!name) {
      throw new Error("Name is required");
    }

    const updated: UserAccount = {
      ...account,
      name,
      photoUrl:
        input.photoUrl !== undefined
          ? optionalTrim(input.photoUrl)
          : account.photoUrl,
    };

    return this.store.save(updated);
  }

  async acceptTerms(
    userId: string,
    input: AcceptTermsInput,
  ): Promise<UserAccount> {
    if (input.termsVersion !== TERMS_VERSION) {
      throw new Error(`Terms version must be ${TERMS_VERSION}`);
    }

    const account = await this.store.findByUserId(userId);
    if (!account) {
      throw new Error("Account not found");
    }

    const now = new Date().toISOString();
    return this.store.save({
      ...account,
      termsAcceptedAt: now,
      termsVersion: input.termsVersion,
    });
  }

  async delete(userId: string): Promise<void> {
    const account = await this.store.findByUserId(userId);
    if (!account) {
      throw new Error("Account not found");
    }

    if (this.jobStore?.deleteByUser) {
      await this.jobStore.deleteByUser(userId);
    }

    await this.store.delete(userId);
  }
}
