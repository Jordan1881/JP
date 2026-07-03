import type pg from "pg";
import type { UserAccount } from "@jp/shared-types";
import type { UserAccountStore } from "./types.js";

interface AccountRow {
  user_id: string;
  name: string;
  email: string;
  photo_url: string | null;
  terms_version: string | null;
  terms_accepted_at: Date | null;
}

function rowToAccount(row: AccountRow): UserAccount {
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    photoUrl: row.photo_url ?? undefined,
    termsVersion: row.terms_version ?? undefined,
    termsAcceptedAt: row.terms_accepted_at?.toISOString(),
  };
}

export class PostgresUserAccountStore implements UserAccountStore {
  constructor(private readonly pool: pg.Pool) {}

  async save(account: UserAccount): Promise<UserAccount> {
    const { rows } = await this.pool.query<AccountRow>(
      `INSERT INTO user_accounts (
         user_id, name, email, photo_url, terms_version, terms_accepted_at
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         photo_url = EXCLUDED.photo_url,
         terms_version = EXCLUDED.terms_version,
         terms_accepted_at = EXCLUDED.terms_accepted_at
       RETURNING user_id, name, email, photo_url, terms_version,
                 terms_accepted_at`,
      [
        account.userId,
        account.name,
        account.email,
        account.photoUrl ?? null,
        account.termsVersion ?? null,
        account.termsAcceptedAt ?? null,
      ],
    );
    return rowToAccount(rows[0]!);
  }

  async findByUserId(userId: string): Promise<UserAccount | null> {
    const { rows } = await this.pool.query<AccountRow>(
      "SELECT * FROM user_accounts WHERE user_id = $1",
      [userId],
    );
    return rows[0] ? rowToAccount(rows[0]) : null;
  }

  /**
   * Removes the account and all remaining user-owned rows (story 36).
   * Jobs are deleted by UserAccountRepository via the JobStore before this
   * runs (their notifications cascade); this transaction sweeps profile,
   * preferences, and any leftover notifications.
   */
  async delete(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM notifications WHERE user_id = $1", [
        userId,
      ]);
      await client.query("DELETE FROM career_profiles WHERE user_id = $1", [
        userId,
      ]);
      await client.query("DELETE FROM user_preferences WHERE user_id = $1", [
        userId,
      ]);
      await client.query("DELETE FROM user_accounts WHERE user_id = $1", [
        userId,
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
