"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UserAccount } from "@jp/shared-types";
import { needsTermsReacceptance } from "@jp/shared-types";
import { fetchAccount } from "@/lib/account-api";
import { authGetCurrentUser, isAuthConfigured } from "@/lib/auth";
import { configureAmplify } from "@/lib/amplify";

interface AuthContextValue {
  loading: boolean;
  userId: string | null;
  account: UserAccount | null;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = new Set(["/login", "/signup", "/terms"]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);

  const refreshAccount = useCallback(async () => {
    if (!userId) {
      setAccount(null);
      return;
    }
    const nextAccount = await fetchAccount();
    setAccount(nextAccount);
  }, [userId]);

  useEffect(() => {
    configureAmplify();

    async function load() {
      if (!isAuthConfigured()) {
        setLoading(false);
        return;
      }

      const user = await authGetCurrentUser();
      if (!user) {
        setUserId(null);
        setAccount(null);
        setLoading(false);
        if (!PUBLIC_PATHS.has(pathname)) {
          router.replace("/login");
        }
        return;
      }

      setUserId(user.userId);
      const nextAccount = await fetchAccount();
      setAccount(nextAccount);
      setLoading(false);

      if (!PUBLIC_PATHS.has(pathname)) {
        if (!nextAccount && pathname !== "/signup") {
          router.replace("/signup");
          return;
        }
        if (nextAccount && needsTermsReacceptance(nextAccount) && pathname !== "/accept-terms") {
          router.replace("/accept-terms");
        }
      }
    }

    void load();
  }, [pathname, router]);

  const value = useMemo(
    () => ({ loading, userId, account, refreshAccount }),
    [loading, userId, account, refreshAccount],
  );

  if (loading && isAuthConfigured() && !PUBLIC_PATHS.has(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
