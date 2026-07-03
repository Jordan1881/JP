const NETWORK_MESSAGE = "Couldn't reach server — try again";

export function isNetworkError(err: unknown): boolean {
  if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.onLine === false) {
    return true;
  }
  if (err instanceof TypeError) {
    return true;
  }
  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    return (
      message.includes("failed to fetch") ||
      message.includes("network") ||
      message.includes("load failed")
    );
  }
  return false;
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (isNetworkError(err)) {
    return NETWORK_MESSAGE;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
