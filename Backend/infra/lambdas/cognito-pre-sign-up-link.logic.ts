import type { UserType } from "@aws-sdk/client-cognito-identity-provider";

/** Cognito username for federated users, e.g. Google_123456789. */
export function parseFederatedUsername(userName: string): {
  providerName: string;
  providerUserId: string;
} | null {
  const separator = userName.indexOf("_");
  if (separator <= 0 || separator >= userName.length - 1) {
    return null;
  }

  return {
    providerName: userName.slice(0, separator),
    providerUserId: userName.slice(separator + 1),
  };
}

/** Prefer the native email/password profile over an existing federated duplicate. */
export function findNativeUserForLinking(
  users: UserType[],
): UserType | undefined {
  return users.find(
    (user) =>
      user.UserStatus !== "EXTERNAL_PROVIDER" &&
      !user.Username?.startsWith("Google_") &&
      !user.Username?.startsWith("Facebook_"),
  );
}

export function shouldLinkExternalProvider(
  triggerSource: string,
  email: string | undefined,
): boolean {
  return triggerSource === "PreSignUp_ExternalProvider" && Boolean(email?.trim());
}
