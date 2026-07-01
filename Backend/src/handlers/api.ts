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
  createJobHandler,
  getJobHandler,
  listJobsHandler,
  patchJobHandler,
} from "../handlers/jobs.js";

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

  switch (`${method} ${path}`) {
    case "GET /health":
      return healthHandler();
    case "GET /jobs":
      return listJobsHandler(event);
    case "POST /jobs":
      return createJobHandler(event);
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
    default:
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Not found" }),
      };
  }
}
