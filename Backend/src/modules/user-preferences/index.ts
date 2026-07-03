import {
  InMemoryUserPreferencesStore,
  UserPreferencesRepository,
} from "./user-preferences.js";

let devStore: InMemoryUserPreferencesStore | null = null;

export function getDevUserPreferencesStore(): InMemoryUserPreferencesStore {
  devStore ??= new InMemoryUserPreferencesStore();
  return devStore;
}

export function getDevUserPreferencesRepository(): UserPreferencesRepository {
  return new UserPreferencesRepository(getDevUserPreferencesStore());
}

export {
  UserPreferencesRepository,
  InMemoryUserPreferencesStore,
  type UserPreferencesStore,
} from "./user-preferences.js";
export { PostgresUserPreferencesStore } from "./postgres-store.js";
