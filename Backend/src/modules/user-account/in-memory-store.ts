import type { UserAccount } from "@jp/shared-types";
import type { UserAccountStore } from "./types.js";

export class InMemoryUserAccountStore implements UserAccountStore {
  private readonly accounts = new Map<string, UserAccount>();

  async save(account: UserAccount): Promise<UserAccount> {
    this.accounts.set(account.userId, structuredClone(account));
    return structuredClone(account);
  }

  async findByUserId(userId: string): Promise<UserAccount | null> {
    const account = this.accounts.get(userId);
    return account ? structuredClone(account) : null;
  }

  async delete(userId: string): Promise<void> {
    this.accounts.delete(userId);
  }

  clear(): void {
    this.accounts.clear();
  }
}
