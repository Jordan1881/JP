"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CURRENT_TERMS_VERSION } from "@jp/shared-types";
import {
  AuthButton,
  AuthCard,
  AuthError,
} from "@/components/AuthCard";
import { acceptTerms } from "@/lib/account-api";
import { useAuth } from "@/components/AuthProvider";

export default function AcceptTermsPage() {
  const router = useRouter();
  const { refreshAccount } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accepted) {
      setError("You must accept the updated Terms of Use to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await acceptTerms({ termsVersion: CURRENT_TERMS_VERSION });
      await refreshAccount();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record acceptance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Updated Terms of Use"
      subtitle={`Our terms have changed. Please review and accept v${CURRENT_TERMS_VERSION} to continue using JP.`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthError message={error} />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Read the full{" "}
          <Link href="/terms" className="text-foreground underline">
            Terms of Use
          </Link>{" "}
          before continuing.
        </p>
        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="mt-1"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>I accept the updated Terms of Use (v{CURRENT_TERMS_VERSION})</span>
        </label>
        <AuthButton disabled={submitting || !accepted}>Continue</AuthButton>
      </form>
    </AuthCard>
  );
}
