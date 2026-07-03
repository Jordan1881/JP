import type pg from "pg";
import type { StageList, UserPreferences } from "@jp/shared-types";
import type { UserPreferencesStore } from "./user-preferences.js";

interface PreferencesRow {
  user_id: string;
  stale_notifications_enabled: boolean;
  pre_deletion_warnings_enabled: boolean;
  stage_list: StageList;
}

function rowToPreferences(row: PreferencesRow): UserPreferences {
  return {
    userId: row.user_id,
    staleNotificationsEnabled: row.stale_notifications_enabled,
    preDeletionWarningsEnabled: row.pre_deletion_warnings_enabled,
    stageList: row.stage_list,
  };
}

export class PostgresUserPreferencesStore implements UserPreferencesStore {
  constructor(private readonly pool: pg.Pool) {}

  async get(userId: string): Promise<UserPreferences | null> {
    const { rows } = await this.pool.query<PreferencesRow>(
      "SELECT * FROM user_preferences WHERE user_id = $1",
      [userId],
    );
    return rows[0] ? rowToPreferences(rows[0]) : null;
  }

  async save(preferences: UserPreferences): Promise<UserPreferences> {
    const { rows } = await this.pool.query<PreferencesRow>(
      `INSERT INTO user_preferences (
         user_id, stale_notifications_enabled, pre_deletion_warnings_enabled,
         stage_list
       )
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         stale_notifications_enabled = EXCLUDED.stale_notifications_enabled,
         pre_deletion_warnings_enabled = EXCLUDED.pre_deletion_warnings_enabled,
         stage_list = EXCLUDED.stage_list
       RETURNING *`,
      [
        preferences.userId,
        preferences.staleNotificationsEnabled,
        preferences.preDeletionWarningsEnabled,
        JSON.stringify(preferences.stageList),
      ],
    );
    return rowToPreferences(rows[0]!);
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.pool.query("DELETE FROM user_preferences WHERE user_id = $1", [
      userId,
    ]);
  }
}
