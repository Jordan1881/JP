"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthButton,
  AuthCard,
  AuthError,
  AuthField,
  authInputClassName,
} from "@/components/AuthCard";
import { useAuth } from "@/components/AuthProvider";
import { updateAccount } from "@/lib/account-api";

export default function AccountPage() {
  const router = useRouter();
  const { account, refreshAccount } = useAuth();
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setPhotoUrl(account.photoUrl ?? "");
    }
  }, [account]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await updateAccount({ name, photoUrl: photoUrl || undefined });
      await refreshAccount();
      setSuccess("Account updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!account) {
    return (
      <AuthCard title="Account" subtitle="No account record found.">
        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="text-sm text-foreground underline"
        >
          Complete signup
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Account"
      subtitle="Manage your identity separate from career profile data."
        embedded
      >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthError message={error} />
        {success ? (
          <p className="text-sm text-emerald-300">{success}</p>
        ) : null}
        <AuthField label="Email">
          <input
            className={`${authInputClassName} opacity-60`}
            value={account.email}
            readOnly
          />
        </AuthField>
        <AuthField label="Name">
          <input
            className={authInputClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </AuthField>
        <AuthField label="Profile photo URL">
          <input
            className={authInputClassName}
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://…"
          />
        </AuthField>
        <AuthButton disabled={submitting}>Save changes</AuthButton>
      </form>
    </AuthCard>
  );
}
