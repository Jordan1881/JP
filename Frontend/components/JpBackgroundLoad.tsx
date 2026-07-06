"use client";

import { JpLoader } from "@/components/JpLoader";

interface JpBackgroundLoadProps {
  active: boolean;
  label?: string;
}

/** Floating JP loader pill for in-page background fetches. */
export function JpBackgroundLoad({ active, label }: JpBackgroundLoadProps) {
  if (!active) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-[199] flex justify-center px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label ?? "Loading"}
    >
      <div className="rounded-full border border-border bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur-md">
        <JpLoader size="sm" label={label} inline />
      </div>
    </div>
  );
}
