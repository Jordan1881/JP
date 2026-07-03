export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSec < 60) {
    return rtf.format(diffSec, "second");
  }
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, "minute");
  }
  const diffHour = Math.round(diffSec / 3600);
  if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, "hour");
  }
  const diffDay = Math.round(diffSec / 86400);
  if (Math.abs(diffDay) < 30) {
    return rtf.format(diffDay, "day");
  }
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12) {
    return rtf.format(diffMonth, "month");
  }
  const diffYear = Math.round(diffDay / 365);
  return rtf.format(diffYear, "year");
}

export function formatDateTimeTooltip(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
