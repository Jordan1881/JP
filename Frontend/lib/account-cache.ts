import type { UserAccount } from "@jp/shared-types";

const PREFIX = "jp-account:";

export function getCachedAccount(userId: string): UserAccount | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(`${PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as UserAccount) : null;
  } catch {
    return null;
  }
}

export function setCachedAccount(account: UserAccount): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(`${PREFIX}${account.userId}`, JSON.stringify(account));
}

export function clearCachedAccount(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(`${PREFIX}${userId}`);
}
