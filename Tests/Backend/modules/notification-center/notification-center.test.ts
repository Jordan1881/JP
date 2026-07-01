import { describe, expect, it } from "vitest";
import {
  InMemoryNotificationStore,
  NotificationCenter,
} from "@backend/modules/notification-center/index.js";

describe("NotificationCenter", () => {
  it("tracks unread count and read state", async () => {
    const center = new NotificationCenter(new InMemoryNotificationStore());
    const created = await center.create({
      userId: "u1",
      type: "stale_job",
      jobId: "j1",
      title: "Stale",
      message: "Update needed",
    });
    expect(await center.unreadCount("u1")).toBe(1);
    await center.markRead("u1", created.id);
    expect(await center.unreadCount("u1")).toBe(0);
  });
});
