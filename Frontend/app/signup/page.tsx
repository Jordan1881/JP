"use client";

import { FormEvent, useState } from "react";
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
import { createAccount } from "@/lib/account-api";
import {
  authConfirmSignUp,
  authSignIn,
  authSignUp,
  isAuthConfigured,
} from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthConfigured()) {
    return (
      <AuthCard title="Auth not configured" subtitle="Set Cognito env vars to enable signup.">
        <p className="text-sm text-muted-foreground">
          Add NEXT_PUBLIC_COGNITO_* values to .env.local for local development.
        </p>
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
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title={needsConfirmation ? "Confirm your email" : "Create your account"}
      subtitle={
        needsConfirmation
          ? "Enter the verification code sent to your email."
          : "Track applications with a personal JP account."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline">
            Sign in
          </Link>
        </>
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
                required
              />
            </AuthField>
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
          {needsConfirmation ? "Verify and continue" : "Create account"}
        </AuthButton>
      </form>
    </AuthCard>
  );
}
