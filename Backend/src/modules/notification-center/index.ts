import {
  NotificationCenter,
  InMemoryNotificationStore,
} from "./notification-center.js";

let devStore: InMemoryNotificationStore | null = null;

export function getDevNotificationStore(): InMemoryNotificationStore {
  devStore ??= new InMemoryNotificationStore();
  return devStore;
}

export function getDevNotificationCenter(): NotificationCenter {
  return new NotificationCenter(getDevNotificationStore());
}

export {
  NotificationCenter,
  InMemoryNotificationStore,
  type NotificationStore,
  type CreateNotificationInput,
} from "./notification-center.js";
