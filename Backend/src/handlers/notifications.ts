import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getUserId } from "./auth.js";
import { getNotificationCenter } from "../services/store-provider.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

export async function listNotificationsHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const center = (await getNotificationCenter());
    const [notifications, unreadCount] = await Promise.all([
      center.list(userId),
      center.unreadCount(userId),
    ]);
    return response(200, { notifications, unreadCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load notifications";
    return response(500, { error: message });
  }
}

export async function markNotificationReadHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const match = event.path.match(/\/notifications\/([^/]+)\/read$/);
  const notificationId = match?.[1];
  if (!notificationId) {
    return response(400, { error: "Notification id is required" });
  }

  try {
    const notification = await (await getNotificationCenter()).markRead(
      getUserId(event),
      notificationId,
    );
    return response(200, { notification });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update notification";
    return response(400, { error: message });
  }
}

export async function markAllNotificationsReadHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    await (await getNotificationCenter()).markAllRead(getUserId(event));
    return response(200, { ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update notifications";
    return response(500, { error: message });
  }
}
