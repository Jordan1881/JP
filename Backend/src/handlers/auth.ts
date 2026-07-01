import type { APIGatewayProxyEvent } from "aws-lambda";
import { LOCAL_DEV_USER_ID } from "../index.js";

export function getUserId(event: APIGatewayProxyEvent): string {
  const authorizerUserId =
    event.requestContext.authorizer?.claims?.sub ??
    event.requestContext.authorizer?.userId;

  if (typeof authorizerUserId === "string" && authorizerUserId.length > 0) {
    return authorizerUserId;
  }

  const headerUserId = event.headers["x-user-id"] ?? event.headers["X-User-Id"];
  if (headerUserId) {
    return headerUserId;
  }

  return LOCAL_DEV_USER_ID;
}
