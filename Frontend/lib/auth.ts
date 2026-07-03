"use client";

import {
  confirmSignUp,
  deleteUser,
  fetchUserAttributes,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
  updatePassword,
  type SignUpOutput,
} from "aws-amplify/auth";
import { configureAmplify, isAuthConfigured } from "./amplify";

configureAmplify();

export { isAuthConfigured };

/** Map Cognito error names to user-facing messages. */
export function formatCognitoError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong. Please try again.";
  }

  const name = (error as Error & { name?: string }).name ?? "";
  const message = error.message;

  switch (name) {
    case "NotAuthorizedException":
      return "Incorrect email or password.";
    case "UserNotConfirmedException":
      return "Please confirm your email before signing in.";
    case "UsernameExistsException":
      return "An account with this email already exists. Sign in instead.";
    case "InvalidPasswordException":
      return "Password does not meet requirements (8+ chars, upper, lower, number).";
    case "CodeMismatchException":
      return "Invalid verification code. Try again.";
    case "ExpiredCodeException":
      return "Verification code expired. Request a new one.";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Too many attempts. Wait a moment and try again.";
    default:
      if (/user.*already.*exist/i.test(message)) {
        return "An account with this email already exists. Sign in instead.";
      }
      return message || "Something went wrong. Please try again.";
  }
}

/** Cognito rejects signUp/signIn when a session already exists. */
async function ensureSignedOut() {
  try {
    await signOut();
  } catch {
    // No active session — safe to continue.
  }
}

export async function authSignUp(input: {
  email: string;
  password: string;
  name: string;
}): Promise<SignUpOutput> {
  await ensureSignedOut();
  return signUp({
    username: input.email,
    password: input.password,
    options: {
      userAttributes: {
        email: input.email,
        name: input.name,
      },
    },
  });
}

export async function authConfirmSignUp(email: string, code: string) {
  await ensureSignedOut();
  return confirmSignUp({ username: email, confirmationCode: code });
}

export async function authSignIn(email: string, password: string) {
  await ensureSignedOut();
  return signIn({ username: email, password });
}

export async function authSignOut() {
  return signOut();
}

export async function authGetCurrentUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function authFetchUserAttributes() {
  try {
    return await fetchUserAttributes();
  } catch {
    return {};
  }
}

export async function authUpdatePassword(
  oldPassword: string,
  newPassword: string,
) {
  return updatePassword({ oldPassword, newPassword });
}

export async function authDeleteUser() {
  return deleteUser();
}

export async function authHeaders(): Promise<HeadersInit> {
  const user = await authGetCurrentUser();
  return {
    "Content-Type": "application/json",
    ...(user?.userId ? { "x-user-id": user.userId } : {}),
  };
}
