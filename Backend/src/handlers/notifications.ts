import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  mapNotificationsError,
} from "../application/index.js";
import { getUserId } from "./auth.js";
import { getNotificationCenter } from "../services/store-provider.js";
import { handleLambda, lambdaResponse } from "./transport.js";

export async function listNotificationsHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  return handleLambda(
    async () =>
      listNotifications(await getNotificationCenter(), getUserId(event)),
    {
      mapError: (error) =>
        mapNotificationsError(error, "Failed to load notifications"),
    },
  );
}

export async function markNotificationReadHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const match = event.path.match(/\/notifications\/([^/]+)\/read$/);
  const notificationId = match?.[1];
  if (!notificationId) {
    return lambdaResponse(400, { error: "Notification id is required" });
  }

  return handleLambda(
    async () =>
      markNotificationRead(
        await getNotificationCenter(),
        getUserId(event),
        notificationId,
      ),
    {
      mapError: (error) =>
        mapNotificationsError(error, "Failed to update notification", 400),
    },
  );
}

export async function markAllNotificationsReadHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  return handleLambda(
    async () =>
      markAllNotificationsRead(await getNotificationCenter(), getUserId(event)),
    {
      mapError: (error) =>
        mapNotificationsError(error, "Failed to update notifications"),
    },
  );
}
