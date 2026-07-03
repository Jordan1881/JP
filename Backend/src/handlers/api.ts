import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { handler as healthHandler } from "../handlers/health.js";
import {
  acceptTermsHandler,
  createAccountHandler,
  deleteAccountHandler,
  getAccountHandler,
  updateAccountHandler,
} from "../handlers/account.js";
import {
  announcementHandler,
  coverLetterHandler,
} from "../handlers/agents.js";
import { getDashboardHandler } from "../handlers/dashboard.js";
import {
  archiveJobHandler,
  createJobHandler,
  deleteJobHandler,
  getJobHandler,
  importJobFromUrlHandler,
  listJobsHandler,
  patchJobHandler,
  restoreJobHandler,
} from "../handlers/jobs.js";
import {
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
} from "../handlers/notifications.js";
import {
  getPreferencesHandler,
  updatePreferencesHandler,
} from "../handlers/preferences.js";
import {
  getProfileHandler,
  profileInterviewHandler,
  updateProfileHandler,
} from "../handlers/profile.js";
import { sweepHandler } from "../handlers/sweep.js";

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const path = event.path.replace(/\/+$/, "") || "/";
  const method = event.httpMethod.toUpperCase();

  if (method === "GET" && /^\/jobs\/[^/]+$/.test(path)) {
    return getJobHandler(event);
  }
  if (method === "PATCH" && /^\/jobs\/[^/]+$/.test(path)) {
    return patchJobHandler(event);
  }
  if (method === "DELETE" && /^\/jobs\/[^/]+$/.test(path)) {
    return deleteJobHandler(event);
  }
  if (method === "POST" && /^\/jobs\/[^/]+\/archive$/.test(path)) {
    return archiveJobHandler(event);
  }
  if (method === "POST" && /^\/jobs\/[^/]+\/restore$/.test(path)) {
    return restoreJobHandler(event);
  }
  if (method === "POST" && /^\/jobs\/[^/]+\/cover-letter$/.test(path)) {
    return coverLetterHandler(event);
  }
  if (method === "POST" && /^\/jobs\/[^/]+\/announcement$/.test(path)) {
    return announcementHandler(event);
  }
  if (method === "POST" && /^\/notifications\/[^/]+\/read$/.test(path)) {
    return markNotificationReadHandler(event);
  }

  switch (`${method} ${path}`) {
    case "GET /health":
      return healthHandler();
    case "GET /jobs":
      return listJobsHandler(event);
    case "POST /jobs":
      return createJobHandler(event);
    case "POST /jobs/import-url":
      return importJobFromUrlHandler(event);
    case "GET /account":
      return getAccountHandler(event);
    case "POST /account":
      return createAccountHandler(event);
    case "PATCH /account":
      return updateAccountHandler(event);
    case "DELETE /account":
      return deleteAccountHandler(event);
    case "POST /account/accept-terms":
      return acceptTermsHandler(event);
    case "GET /preferences":
      return getPreferencesHandler(event);
    case "PATCH /preferences":
      return updatePreferencesHandler(event);
    case "GET /profile":
      return getProfileHandler(event);
    case "PATCH /profile":
      return updateProfileHandler(event);
    case "POST /profile/interview":
      return profileInterviewHandler(event);
    case "GET /notifications":
      return listNotificationsHandler(event);
    case "POST /notifications/read-all":
      return markAllNotificationsReadHandler(event);
    case "GET /dashboard":
      return getDashboardHandler(event);
    case "POST /sweep":
      return sweepHandler(event);
    default:
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Not found" }),
      };
  }
}
