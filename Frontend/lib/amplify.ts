"use client";

import { Amplify } from "aws-amplify";

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN?.replace(
  /^https?:\/\//,
  "",
);

let configured = false;

function appOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function configureAmplify(): void {
  if (configured || !userPoolId || !userPoolClientId) {
    return;
  }

  const oauth =
    cognitoDomain !== undefined && cognitoDomain.length > 0
      ? {
          domain: cognitoDomain,
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [`${appOrigin()}/auth/callback`],
          redirectSignOut: [`${appOrigin()}/`],
          responseType: "code" as const,
        }
      : undefined;

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        ...(oauth ? { loginWith: { oauth } } : {}),
      },
    },
  });

  configured = true;
}

export function isAuthConfigured(): boolean {
  return Boolean(userPoolId && userPoolClientId);
}

export function isGoogleAuthConfigured(): boolean {
  return isAuthConfigured() && Boolean(cognitoDomain);
}
