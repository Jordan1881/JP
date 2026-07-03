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
import { StageListEditor } from "@/components/StageListEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { deleteAccount } from "@/lib/account-api";
import { fetchPreferences, updatePreferences } from "@/lib/preferences-api";
import {
  authDeleteUser,
  authSignOut,
  authUpdatePassword,
} from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [stageList, setStageList] = useState<string[]>([]);
  const [staleNotificationsEnabled, setStaleNotificationsEnabled] = useState(true);
  const [preDeletionWarningsEnabled, setPreDeletionWarningsEnabled] =
    useState(true);
  const [newStage, setNewStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchPreferences().then((preferences) => {
      setStageList(preferences.stageList);
      setStaleNotificationsEnabled(preferences.staleNotificationsEnabled);
      setPreDeletionWarningsEnabled(preferences.preDeletionWarningsEnabled);
    });
  }, []);

  async function savePreferences() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await updatePreferences({
        stageList,
        staleNotificationsEnabled,
        preDeletionWarningsEnabled,
      });
      setSuccess("Preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordChange(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await authUpdatePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setSuccess("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAccount() {
    if (confirmDelete !== "DELETE") {
      setError('Type DELETE to confirm account removal.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await deleteAccount();
      await authDeleteUser();
      await authSignOut();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Settings"
      subtitle="Pipeline stages, notifications, password, and account."
        embedded
      >
      <div className="space-y-8">
        <AuthError message={error} />
        {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            Switch between light and dark mode. Your choice is saved in this browser.
          </p>
          <ThemeToggle variant="settings" />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Interview stages</h2>
          <p className="text-sm text-muted-foreground">
            Drag to reorder custom stages. Accepted and Rejected stay fixed as
            terminal outcomes.
          </p>
          <StageListEditor
            stageList={stageList}
            onStageListChange={setStageList}
            newStage={newStage}
            onNewStageChange={setNewStage}
            onAddStage={() => {
              if (newStage.trim()) {
                setStageList([...stageList, newStage.trim()]);
                setNewStage("");
              }
            }}
            disabled={submitting}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={staleNotificationsEnabled}
              onChange={(event) => setStaleNotificationsEnabled(event.target.checked)}
            />
            Stale-application reminders (14 days)
          </label>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={preDeletionWarningsEnabled}
              onChange={(event) => setPreDeletionWarningsEnabled(event.target.checked)}
            />
            Pre-deletion warnings for archived jobs
          </label>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void savePreferences()}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground uppercase disabled:opacity-50"
          >
            Save preferences
          </button>
        </section>

        <form onSubmit={handlePasswordChange} className="space-y-4 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground">Change password</h2>
          <AuthField label="Current password">
            <input
              type="password"
              className={authInputClassName}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </AuthField>
          <AuthField label="New password">
            <input
              type="password"
              className={authInputClassName}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </AuthField>
          <AuthButton disabled={submitting}>Update password</AuthButton>
        </form>

        <div className="space-y-4 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-red-300">Delete account</h2>
          <p className="text-sm text-muted-foreground">
            This permanently deletes your jobs, profile data, and account.
          </p>
          <AuthField label='Type "DELETE" to confirm'>
            <input
              className={authInputClassName}
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
            />
          </AuthField>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleDeleteAccount()}
            className="w-full rounded-md border border-red-500/40 px-4 py-2.5 text-xs font-semibold tracking-widest text-red-200 uppercase transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            Delete my account
          </button>
        </div>
      </div>
    </AuthCard>
  );
}
