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
import { JpBackgroundLoad } from "@/components/JpBackgroundLoad";
import { JpLoader } from "@/components/JpLoader";
import { fetchAccount } from "@/lib/account-api";
import { getCachedAccount } from "@/lib/account-cache";
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
const AUTH_GATE_PATHS = new Set(["/login", "/signup", "/terms", "/accept-terms"]);

function applyPostAuthRouting(
  pathname: string,
  router: ReturnType<typeof useRouter>,
  nextAccount: UserAccount | null,
  hasSession: boolean,
) {
  if (!hasSession) {
    if (!PUBLIC_PATHS.has(pathname)) {
      router.replace("/login");
    }
    return;
  }

  if (pathname === "/signup" && nextAccount) {
    router.replace("/");
    return;
  }

  if (!nextAccount && pathname !== "/signup") {
    router.replace("/signup");
    return;
  }

  if (
    nextAccount &&
    needsTermsReacceptance(nextAccount) &&
    pathname !== "/accept-terms"
  ) {
    router.replace("/accept-terms");
  }
}

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
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (!isAuthConfigured()) {
          return;
        }

        const user = await authGetCurrentUser();
        if (cancelled) {
          return;
        }

        if (!user) {
          setUserId(null);
          setAccount(null);
          applyPostAuthRouting(pathname, router, null, false);
          return;
        }

        setUserId(user.userId);
        const cached = getCachedAccount(user.userId);
        if (cached) {
          setAccount(cached);
        }

        const nextAccount = (await fetchAccount()) ?? cached ?? null;
        if (cancelled) {
          return;
        }

        setAccount(nextAccount);
        applyPostAuthRouting(pathname, router, nextAccount, true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const value = useMemo(
    () => ({ loading, userId, account, refreshAccount }),
    [loading, userId, account, refreshAccount],
  );

  const showAuthGate =
    loading && isAuthConfigured() && !AUTH_GATE_PATHS.has(pathname);

  if (showAuthGate) {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
          <JpLoader size="lg" label="Loading your account…" />
        </div>
      </>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      <JpBackgroundLoad active={loading} label="Syncing account…" />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
