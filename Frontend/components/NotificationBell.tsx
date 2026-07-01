"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AppNotification } from "@jp/shared-types";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/preferences-api";
import { archiveJob } from "@/lib/jobs-api";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  async function load() {
    const data = await fetchNotifications();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("pointerdown", handlePointerDown);
      return () => document.removeEventListener("pointerdown", handlePointerDown);
    }
  }, [open]);

  async function handleArchive(jobId: string, notificationId: string) {
    await archiveJob(jobId, "no_response");
    await markNotificationRead(notificationId);
    await load();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          setOpen((value) => !value);
          void load();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-secondary"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            d="M12 3a5 5 0 00-5 5v2.1c0 .5-.2 1-.5 1.4L5 13.5V15h14v-1.5l-1.5-2.4c-.3-.4-.5-.9-.5-1.4V8a5 5 0 00-5-5zm-2 14h4a2 2 0 11-4 0z"
            fill="currentColor"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-md border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-foreground">Notifications</span>
            <button
              type="button"
              onClick={() => void markAllNotificationsRead().then(load)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-border px-4 py-3 ${notification.read ? "opacity-70" : ""}`}
                >
                  <p className="text-sm font-medium text-foreground">{notification.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                  <div className="mt-2 flex gap-3">
                    {notification.type === "stale_job" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleArchive(notification.jobId, notification.id)
                        }
                        className="text-xs text-foreground underline"
                      >
                        Archive job
                      </button>
                    ) : null}
                    <Link
                      href={`/jobs/${notification.jobId}`}
                      className="text-xs text-foreground underline"
                      onClick={() => setOpen(false)}
                    >
                      View job
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
