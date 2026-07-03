"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthButton,
  AuthCard,
  AuthField,
  authInputClassName,
} from "@/components/AuthCard";
import { FormError } from "@/components/FormError";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";
import { updateAccount } from "@/lib/account-api";
import { getErrorMessage } from "@/lib/feedback";

export default function AccountPage() {
  const router = useRouter();
  const { account, refreshAccount } = useAuth();
  const { showSuccess } = useToast();
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    setSubmitting(true);
    try {
      await updateAccount({ name, photoUrl: photoUrl || undefined });
      await refreshAccount();
      showSuccess("Account updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Update failed"));
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
      footer={
        <div className="flex gap-4">
          <Link href="/" className="text-foreground underline">
            Home
          </Link>
          <Link href="/settings" className="text-foreground underline">
            Settings
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormError message={error} onDismiss={() => setError(null)} />
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
