"use client";

interface FormErrorProps {
  message: string | null;
  onDismiss?: () => void;
  id?: string;
}

export function FormError({ message, onDismiss, id }: FormErrorProps) {
  if (!message) return null;
  return (
    <div id={id} role="alert" className="flex items-start justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      <p className="min-w-0 flex-1">{message}</p>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="shrink-0 text-red-200/80 transition-colors hover:text-red-100">×</button>
      ) : null}
    </div>
  );
}
