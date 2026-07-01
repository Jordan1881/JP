import type { StageList, UpdateUserPreferencesInput, UserPreferences } from "@jp/shared-types";
import { DEFAULT_PIPELINE_STAGES } from "../stage-pipeline-manager/index.js";

export interface UserPreferencesStore {
  get(userId: string): Promise<UserPreferences | null>;
  save(preferences: UserPreferences): Promise<UserPreferences>;
  deleteByUser(userId: string): Promise<void>;
}

export class InMemoryUserPreferencesStore implements UserPreferencesStore {
  private readonly preferences = new Map<string, UserPreferences>();

  async get(userId: string): Promise<UserPreferences | null> {
    const prefs = this.preferences.get(userId);
    return prefs ? structuredClone(prefs) : null;
  }

  async save(preferences: UserPreferences): Promise<UserPreferences> {
    this.preferences.set(preferences.userId, structuredClone(preferences));
    return structuredClone(preferences);
  }

  async deleteByUser(userId: string): Promise<void> {
    this.preferences.delete(userId);
  }

  clear(): void {
    this.preferences.clear();
  }
}

function defaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    staleNotificationsEnabled: true,
    preDeletionWarningsEnabled: true,
    stageList: [...DEFAULT_PIPELINE_STAGES],
  };
}

function sanitizeStageList(stageList: StageList): StageList {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const stage of stageList) {
    const trimmed = stage.trim();
    if (!trimmed || trimmed === "Accepted" || trimmed === "Rejected") {
      continue;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      cleaned.push(trimmed);
    }
  }
  return cleaned.length > 0 ? cleaned : [...DEFAULT_PIPELINE_STAGES];
}

export class UserPreferencesRepository {
  constructor(private readonly store: UserPreferencesStore) {}

  async getOrCreate(userId: string): Promise<UserPreferences> {
    const existing = await this.store.get(userId);
    if (existing) {
      return existing;
    }
    return this.store.save(defaultPreferences(userId));
  }

  async update(
    userId: string,
    input: UpdateUserPreferencesInput,
  ): Promise<UserPreferences> {
    const current = await this.getOrCreate(userId);
    const next: UserPreferences = {
      ...current,
      ...input,
      stageList:
        input.stageList !== undefined
          ? sanitizeStageList(input.stageList)
          : current.stageList,
    };
    return this.store.save(next);
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.store.deleteByUser(userId);
  }
}
