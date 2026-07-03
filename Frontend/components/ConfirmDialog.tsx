"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    cancelRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-xs font-semibold tracking-widest text-foreground uppercase transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "rounded-md px-4 py-2 text-xs font-semibold tracking-widest uppercase disabled:opacity-50",
              destructive
                ? "border border-red-500/40 text-red-200 hover:bg-red-500/10"
                : "bg-primary text-primary-foreground hover:bg-white",
            )}
          >
            {loading ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
