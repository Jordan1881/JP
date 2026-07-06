import { getDevStores } from "../../services/composition-root.js";
import {
  InMemoryProfileStore,
  ProfileRepository,
} from "./profile-repository.js";

export function getDevProfileStore(): InMemoryProfileStore {
  return getDevStores().profileStore as InMemoryProfileStore;
}

export function getDevProfileRepository(): ProfileRepository {
  return getDevStores().profileRepository;
}

export {
  ProfileRepository,
  InMemoryProfileStore,
  type ProfileStore,
} from "./profile-repository.js";
export { PostgresProfileStore } from "./postgres-store.js";
