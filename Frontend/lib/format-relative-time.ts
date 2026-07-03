const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

export function formatRelativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  const seconds = Math.round((then - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, secondsInUnit] of UNITS) {
    const value = Math.round(seconds / secondsInUnit);
    if (Math.abs(value) >= 1) {
      return rtf.format(value, unit);
    }
  }
  return rtf.format(0, "second");
}
