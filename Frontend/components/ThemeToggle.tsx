"use client";

import { useTheme } from "@/components/ThemeProvider";
import type { Theme } from "@/lib/theme";

interface ThemeToggleProps {
  variant?: "menu" | "settings";
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" fill="none" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M21 14.5A8.5 8.5 0 1111.5 4a6.5 6.5 0 109.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeOption({
  value,
  label,
  active,
  onSelect,
}: {
  value: Theme;
  label: string;
  active: boolean;
  onSelect: (theme: Theme) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={[
        "flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-secondary text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {value === "light" ? <SunIcon /> : <MoonIcon />}
      {label}
    </button>
  );
}

export function ThemeIconButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export function ThemeToggle({ variant = "menu" }: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useTheme();

  if (variant === "settings") {
    return (
      <div className="flex gap-2">
        <ThemeOption
          value="light"
          label="Light"
          active={theme === "light"}
          onSelect={setTheme}
        />
        <ThemeOption
          value="dark"
          label="Dark"
          active={theme === "dark"}
          onSelect={setTheme}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={toggleTheme}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
