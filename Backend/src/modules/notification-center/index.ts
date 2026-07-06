import { getDevStores } from "../../services/composition-root.js";
import {
  NotificationCenter,
  InMemoryNotificationStore,
} from "./notification-center.js";

export function getDevNotificationStore(): InMemoryNotificationStore {
  return getDevStores().notificationStore as InMemoryNotificationStore;
}

export function getDevNotificationCenter(): NotificationCenter {
  return getDevStores().notificationCenter;
}

export {
  NotificationCenter,
  InMemoryNotificationStore,
  type NotificationStore,
  type CreateNotificationInput,
} from "./notification-center.js";
export { PostgresNotificationStore } from "./postgres-store.js";
