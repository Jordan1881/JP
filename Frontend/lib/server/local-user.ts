import { LOCAL_DEV_USER_ID } from "@jp/backend";

export function getLocalUserId(request: Request): string {
  return request.headers.get("x-user-id") ?? LOCAL_DEV_USER_ID;
}
