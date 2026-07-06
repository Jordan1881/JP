export class ApplicationError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApplicationError";
    this.statusCode = statusCode;
  }
}

export type ErrorMapping = { statusCode: number; message: string };

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function mapApplicationError(
  error: unknown,
  fallbackMessage: string,
  fallbackStatus = 500,
): ErrorMapping {
  if (error instanceof ApplicationError) {
    return { statusCode: error.statusCode, message: error.message };
  }
  const message = messageFrom(error, fallbackMessage);
  return { statusCode: fallbackStatus, message };
}

function includesAny(message: string, markers: string[]): boolean {
  return markers.some((marker) => message.includes(marker));
}

export function mapAccountError(error: unknown): ErrorMapping {
  if (error instanceof ApplicationError) {
    return { statusCode: error.statusCode, message: error.message };
  }
  const message = messageFrom(error, "Account request failed");
  const statusCode = includesAny(message, [
    "required",
    "must be",
    "not found",
    "already exists",
    "confirmation",
  ])
    ? 400
    : 500;
  return { statusCode, message };
}

export function mapPreferencesError(
  error: unknown,
  fallbackMessage = "Failed to load preferences",
): ErrorMapping {
  return mapApplicationError(error, fallbackMessage);
}

export function mapNotificationsError(
  error: unknown,
  fallbackMessage: string,
  fallbackStatus = 500,
): ErrorMapping {
  return mapApplicationError(error, fallbackMessage, fallbackStatus);
}

export function mapDashboardError(error: unknown): ErrorMapping {
  return mapApplicationError(error, "Failed to load dashboard");
}

export function mapSweepError(error: unknown): ErrorMapping {
  return mapApplicationError(error, "Sweep failed");
}
