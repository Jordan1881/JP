"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AppNotification } from "@jp/shared-types";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/preferences-api";
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

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    if (!open) return;
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function handleDismiss(notificationId: string) {
    await markNotificationRead(notificationId);
    setNotifications((c) => c.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    void load();
  }

  async function handleArchive(jobId: string, notificationId: string) {
    await archiveJob(jobId, "no_response");
    await handleDismiss(notificationId);
  }

  return (
    <div ref={menuRef} className="relative">
      <button type="button" aria-label="Notifications" aria-expanded={open} aria-haspopup="dialog" onClick={() => { setOpen((v) => !v); void load(); }} className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-secondary">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path d="M12 3a5 5 0 00-5 5v2.1c0 .5-.2 1-.5 1.4L5 13.5V15h14v-1.5l-1.5-2.4c-.3-.4-.5-.9-.5-1.4V8a5 5 0 00-5-5zm-2 14h4a2 2 0 11-4 0z" fill="currentColor" /></svg>
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">{unreadCount}</span> : null}
      </button>
      {open ? (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Notifications</span>
            <button type="button" onClick={() => void markAllNotificationsRead().then(() => { setUnreadCount(0); void load(); })} className="text-xs text-muted-foreground hover:text-foreground">Mark all read</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                <p>No notifications yet.</p>
                <p className="mt-2 text-xs">Stale-application reminders appear when a job has no updates for 14+ days.</p>
              </div>
            ) : notifications.map((n) => (
              <div key={n.id} className={cn("border-b border-border px-4 py-3", n.read && "opacity-70", n.type === "pre_deletion_warning" ? "border-l-2 border-l-amber-500/80 bg-amber-500/5" : n.type === "stale_job" ? "border-l-2 border-l-border" : "")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  <time dateTime={n.createdAt} className="shrink-0 text-[10px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</time>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                {n.type === "pre_deletion_warning" ? <p className="mt-2 text-xs text-amber-200/90">Open the archived job to restore it before permanent deletion.</p> : null}
                <div className="mt-2 flex flex-wrap gap-3">
                  {n.type === "stale_job" ? (<><button type="button" onClick={() => void handleArchive(n.jobId, n.id)} className="text-xs underline">Archive job</button><button type="button" onClick={() => void handleDismiss(n.id)} className="text-xs text-muted-foreground underline">Dismiss</button></>) : <button type="button" onClick={() => void handleDismiss(n.id)} className="text-xs text-muted-foreground underline">Dismiss</button>}
                  <Link href={`/jobs/${n.jobId}`} className="text-xs underline" onClick={() => setOpen(false)}>Open job</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
