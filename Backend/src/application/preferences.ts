import type { UpdateUserPreferencesInput } from "@jp/shared-types";
import type { UserPreferencesRepository } from "../modules/user-preferences/index.js";

export async function getPreferences(
  repository: UserPreferencesRepository,
  userId: string,
) {
  const preferences = await repository.getOrCreate(userId);
  return { preferences };
}

export async function updatePreferences(
  repository: UserPreferencesRepository,
  userId: string,
  input: UpdateUserPreferencesInput,
) {
  const preferences = await repository.update(userId, input);
  return { preferences };
}
