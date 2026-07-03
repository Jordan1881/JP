"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";
interface Toast { id: string; message: string; variant: ToastVariant; }
interface ToastContextValue { showSuccess: (message: string) => void; showError: (message: string) => void; }

const ToastContext = createContext<ToastContextValue | null>(null);
const AUTO_DISMISS_MS = 5000;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (toast.variant !== "success") return;
    const timer = window.setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.id, toast.variant]);

  return (
    <div role="status" aria-live={toast.variant === "error" ? "assertive" : "polite"} className={cn(
      "pointer-events-auto flex max-w-sm items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg backdrop-blur-sm",
      toast.variant === "success" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100" : "border-red-500/30 bg-red-500/15 text-red-100",
    )}>
      <p className="min-w-0 flex-1">{toast.message}</p>
      <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification" className="shrink-0 opacity-70 transition-opacity hover:opacity-100">×</button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const dismiss = useCallback((id: string) => setToasts((c) => c.filter((t) => t.id !== id)), []);
  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = `toast-${nextId.current++}`;
    setToasts((c) => [...c, { id, message, variant }]);
  }, []);
  const value = useMemo(() => ({ showSuccess: (m: string) => push(m, "success"), showError: (m: string) => push(m, "error") }), [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
