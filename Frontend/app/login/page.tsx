"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthButton,
  AuthCard,
  AuthError,
  AuthField,
  authInputClassName,
} from "@/components/AuthCard";
import { authSignIn, formatCognitoError, isAuthConfigured } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthConfigured()) {
    return (
      <AuthCard title="Auth not configured" subtitle="Set Cognito env vars to enable login.">
        <Link href="/" className="text-sm text-foreground underline">
          Continue without auth (local dev)
        </Link>
      </AuthCard>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authSignIn(email, password);
      router.replace("/");
    } catch (err) {
      setError(formatCognitoError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your JP account."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-foreground underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthError message={error} />
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
            required
          />
        </AuthField>
        <AuthButton disabled={submitting}>Sign in</AuthButton>
      </form>
    </AuthCard>
  );
}
