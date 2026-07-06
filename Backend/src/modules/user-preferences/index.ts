import { getDevStores } from "../../services/composition-root.js";
import {
  InMemoryUserPreferencesStore,
  UserPreferencesRepository,
} from "./user-preferences.js";

export function getDevUserPreferencesStore(): InMemoryUserPreferencesStore {
  return getDevStores().preferencesStore as InMemoryUserPreferencesStore;
}

export function getDevUserPreferencesRepository(): UserPreferencesRepository {
  return getDevStores().userPreferencesRepository;
}

export {
  UserPreferencesRepository,
  InMemoryUserPreferencesStore,
  type UserPreferencesStore,
} from "./user-preferences.js";
export { PostgresUserPreferencesStore } from "./postgres-store.js";
