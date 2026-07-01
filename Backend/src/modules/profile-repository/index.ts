import {
  InMemoryProfileStore,
  ProfileRepository,
} from "./profile-repository.js";

let devStore: InMemoryProfileStore | null = null;

export function getDevProfileStore(): InMemoryProfileStore {
  devStore ??= new InMemoryProfileStore();
  return devStore;
}

export function getDevProfileRepository(): ProfileRepository {
  return new ProfileRepository(getDevProfileStore());
}

export {
  ProfileRepository,
  InMemoryProfileStore,
  type ProfileStore,
} from "./profile-repository.js";
