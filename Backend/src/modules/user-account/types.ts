import type { UserAccount } from "@jp/shared-types";

export interface UserAccountStore {
  save(account: UserAccount): Promise<UserAccount>;
  findByUserId(userId: string): Promise<UserAccount | null>;
  delete(userId: string): Promise<void>;
}
