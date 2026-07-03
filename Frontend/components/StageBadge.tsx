"use client";

import { TERMINAL_STAGES } from "@jp/shared-types";
import { cn } from "@/lib/utils";

interface StageBadgeProps {
  stage: string;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const isAccepted = stage === "Accepted";
  const isRejected = stage === "Rejected";
  const isTerminal = (TERMINAL_STAGES as readonly string[]).includes(stage);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        isAccepted && "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
        isRejected && "border-border bg-muted/40 text-muted-foreground",
        !isTerminal && "border-border bg-secondary text-foreground",
        className,
      )}
    >
      {stage}
    </span>
  );
}
