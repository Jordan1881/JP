export {
  ApplicationError,
  mapAccountError,
  mapApplicationError,
  mapDashboardError,
  mapNotificationsError,
  mapPreferencesError,
  mapSweepError,
} from "./errors.js";
export type { ErrorMapping } from "./errors.js";
export {
  getAccount,
  createAccount,
  updateAccount,
  acceptTerms,
  deleteAccount,
} from "./account.js";
export { getPreferences, updatePreferences } from "./preferences.js";
export {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notifications.js";
export { getDashboardStats } from "./dashboard.js";
export { runUserSweep } from "./sweep.js";
