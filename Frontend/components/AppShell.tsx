"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppLogo } from "@/components/AppLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { NavUserMenu } from "@/components/NavUserMenu";
import { ThemeIconButton } from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthProvider";
import { authSignOut, isAuthConfigured } from "@/lib/auth";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
] as const;

const MENU_NAV = [
  { href: "/dashboard", label: "Dashboard", match: (path: string) => path === "/dashboard" },
  { href: "/archive", label: "Archive", match: (path: string) => path === "/archive" },
  { href: "/profile", label: "Profile", match: (path: string) => path.startsWith("/profile") },
  { href: "/settings", label: "Settings", match: (path: string) => path === "/settings" },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function DesktopNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-sm transition-colors",
        active
          ? "relative font-medium text-foreground after:absolute after:-bottom-[21px] after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function MenuNavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block w-full rounded-md px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

function MenuButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {label}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { account } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === "/";

  async function handleSignOut() {
    await authSignOut();
    router.push("/login");
  }

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    if (!menuOpen) return;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 md:gap-8">
            <AppLogo showWordmark height={36} />
            <div className="hidden items-center gap-6 md:flex">
              {PRIMARY_NAV.map((item) => (
                <DesktopNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={item.match(pathname)}
                />
              ))}
              {isHome ? (
                <>
                  <button
                    type="button"
                    onClick={() => scrollToSection("applications")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Applications
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection("add-job")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Add job
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isHome ? (
              <button
                type="button"
                onClick={() => scrollToSection("add-job")}
                className="hidden rounded-md bg-primary px-3 py-2 text-xs font-semibold tracking-widest text-primary-foreground uppercase hover:bg-white sm:inline-flex"
              >
                Add application
              </button>
            ) : null}
            <ThemeIconButton />
            {isAuthConfigured() ? (
              <>
                <NotificationBell />
                <NavUserMenu
                  userName={account?.name}
                  onSignOut={() => void handleSignOut()}
                  compact
                />
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-label="Open navigation menu"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-secondary"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                    <path
                      d="M4 7h16M4 12h16M4 17h16"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </>
            ) : (
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-border bg-card shadow-xl">
            <div className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
              Menu
            </div>
            <nav className="flex flex-col gap-0.5 p-3" aria-label="Main menu">
              {MENU_NAV.map((item) => (
                <MenuNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={item.match(pathname)}
                  onNavigate={() => setMenuOpen(false)}
                />
              ))}
              {isHome ? (
                <>
                  <div className="my-2 border-t border-border" />
                  <MenuButton
                    label="Applications"
                    onClick={() => {
                      scrollToSection("applications");
                      setMenuOpen(false);
                    }}
                  />
                  <MenuButton
                    label="Add job"
                    onClick={() => {
                      scrollToSection("add-job");
                      setMenuOpen(false);
                    }}
                  />
                </>
              ) : null}
            </nav>
          </div>
        </>
      ) : null}

      {children}
    </div>
  );
}
