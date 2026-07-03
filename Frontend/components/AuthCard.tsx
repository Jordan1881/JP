import type { ReactNode } from "react";
import { AppLogo } from "@/components/AppLogo";
import { ThemeIconButton } from "@/components/ThemeToggle";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  embedded?: boolean;
}

export function AuthCard({ title, subtitle, children, footer, embedded = false }: AuthCardProps) {
  const card = (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-xl">
      <div className="mb-8">
        {embedded ? null : <AppLogo height={36} />}
        <h1 className={embedded ? "text-2xl font-semibold tracking-tight text-foreground" : "mt-6 text-2xl font-semibold tracking-tight text-foreground"}>{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
      {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
  if (embedded) return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{card}</div>;
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="absolute top-6 right-6"><ThemeIconButton /></div>
      {card}
    </div>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export const authInputClassName =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 transition-colors focus:border-foreground/30";

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      {message}
    </p>
  );
}

export function AuthButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-md bg-primary px-4 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
