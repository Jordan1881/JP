"use client";

/** Thin indeterminate bar at the viewport top (Safari / Apple-style). */
export function TopLoadBar({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px] overflow-hidden bg-white/10"
      role="progressbar"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="jp-top-load-bar h-full w-[38%] bg-white/95 dark:bg-white/90" />
    </div>
  );
}
