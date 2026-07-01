"use client";

import { Amplify } from "aws-amplify";

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

let configured = false;

export function configureAmplify(): void {
  if (configured || !userPoolId || !userPoolClientId) {
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
      },
    },
  });

  configured = true;
}

export function isAuthConfigured(): boolean {
  return Boolean(userPoolId && userPoolClientId);
}
