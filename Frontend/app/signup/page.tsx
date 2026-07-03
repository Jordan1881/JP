"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CURRENT_TERMS_VERSION } from "@jp/shared-types";
import {
  AuthButton,
  AuthCard,
  AuthError,
  AuthField,
  authInputClassName,
} from "@/components/AuthCard";
import { useAuth } from "@/components/AuthProvider";
import { createAccount, fetchAccount } from "@/lib/account-api";
import {
  authConfirmSignUp,
  authFetchUserAttributes,
  authSignIn,
  authSignUp,
  formatCognitoError,
  isAuthConfigured,
} from "@/lib/auth";

type SignupMode = "loading" | "new" | "complete";

export default function SignupPage() {
  const router = useRouter();
  const { loading: authLoading, userId, refreshAccount } = useAuth();
  const [mode, setMode] = useState<SignupMode>("loading");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthConfigured()) {
      setMode("new");
      return;
    }

    async function loadSession() {
      if (!userId) {
        setMode("new");
        return;
      }

      const existingAccount = await fetchAccount();
      if (existingAccount) {
        router.replace("/");
        return;
      }

      const attributes = await authFetchUserAttributes();
      setEmail(attributes.email ?? "");
      setName(attributes.name ?? "");
      setMode("complete");
    }

    void loadSession();
  }, [authLoading, router, userId]);

  if (!isAuthConfigured()) {
    return (
      <AuthCard title="Auth not configured" subtitle="Set Cognito env vars to enable signup.">
        <p className="text-sm text-muted-foreground">
          Add NEXT_PUBLIC_COGNITO_* values to .env.local for local development.
        </p>
      </AuthCard>
    );
  }

  if (mode === "loading" || authLoading) {
    return (
      <AuthCard title="Loading…" subtitle="Checking your session.">
        <p className="text-sm text-muted-foreground">One moment.</p>
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError("You must accept the Terms of Use to create an account.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "complete") {
        await createAccount({
          name,
          email,
          termsVersion: CURRENT_TERMS_VERSION,
        });
        await refreshAccount();
        router.replace("/");
        return;
      }

      if (!needsConfirmation) {
        const result = await authSignUp({ name, email, password });
        if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          setNeedsConfirmation(true);
          return;
        }
      } else {
        await authConfirmSignUp(email, code);
      }

      await authSignIn(email, password);
      await createAccount({
        name,
        email,
        termsVersion: CURRENT_TERMS_VERSION,
      });
      await refreshAccount();
      router.replace("/");
    } catch (err) {
      setError(formatCognitoError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const isComplete = mode === "complete";
  const title = needsConfirmation
    ? "Confirm your email"
    : isComplete
      ? "Finish your account"
      : "Create your account";
  const subtitle = needsConfirmation
    ? "Enter the verification code sent to your email."
    : isComplete
      ? "You're signed in. Accept the terms to start using JP."
      : "Track applications with a personal JP account.";

  return (
    <AuthCard
      title={title}
      subtitle={subtitle}
      footer={
        isComplete ? (
          <Link href="/" className="text-foreground underline">
            Back to home
          </Link>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-foreground underline">
              Sign in
            </Link>
          </>
        )
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthError message={error} />

        {!needsConfirmation ? (
          <>
            <AuthField label="Name">
              <input
                className={authInputClassName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </AuthField>
            <AuthField label="Email">
              <input
                type="email"
                className={authInputClassName}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={isComplete}
                required
              />
            </AuthField>
            {!isComplete ? (
              <AuthField label="Password">
                <input
                  type="password"
                  className={authInputClassName}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </AuthField>
            ) : null}
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="text-foreground underline">
                  Terms of Use
                </Link>{" "}
                (v{CURRENT_TERMS_VERSION})
              </span>
            </label>
          </>
        ) : (
          <AuthField label="Verification code">
            <input
              className={authInputClassName}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </AuthField>
        )}

        <AuthButton disabled={submitting || (!needsConfirmation && !termsAccepted)}>
          {needsConfirmation
            ? "Verify and continue"
            : isComplete
              ? "Finish setup"
              : "Create account"}
        </AuthButton>
      </form>
    </AuthCard>
  );
}
