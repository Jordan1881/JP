"use client";

import { JpLoader } from "@/components/JpLoader";
import { cn } from "@/lib/utils";

interface JpLoadOverlayProps {
  active: boolean;
  label?: string;
  className?: string;
}

/** Local overlay for a card or section while data loads in the background. */
export function JpLoadOverlay({ active, label, className }: JpLoadOverlayProps) {
  if (!active) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-background/70 backdrop-blur-[2px]",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <JpLoader size="sm" label={label} inline />
    </div>
  );
}
