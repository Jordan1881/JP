"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { CareerProfile } from "@jp/shared-types";
import { fetchProfile, updateProfile } from "@/lib/profile-api";
import { authInputClassName, AuthButton, AuthCard, AuthError, AuthField } from "@/components/AuthCard";

export default function ProfilePage() {
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void fetchProfile().then(setProfile);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setError(null);
    try {
      const updated = await updateProfile({
        techStack: profile.techStack,
        targetRoles: profile.targetRoles,
        seniority: profile.seniority,
        yearsOfExperience: profile.yearsOfExperience,
        locationPreference: profile.locationPreference,
        remotePreference: profile.remotePreference,
        salaryExpectations: profile.salaryExpectations,
        notableProjects: profile.notableProjects,
        softSkills: profile.softSkills,
        careerNarrative: profile.careerNarrative,
      });
      setProfile(updated);
      setSuccess("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  if (!profile?.interviewCompletedAt) {
    return (
      <AuthCard
        title="Career profile"
        subtitle="Complete the one-time interview to unlock AI features."
        embedded
      >
        <Link
          href="/profile/interview"
          className="inline-block rounded-md bg-primary px-5 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground uppercase"
        >
          Start profile interview
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Career profile"
      subtitle="Edit the structured fields used by cover letters and announcements."
      footer={<Link href="/" className="text-foreground underline">Home</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />
        {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
        {[
          ["Seniority", "seniority"],
          ["Years of experience", "yearsOfExperience"],
          ["Location preference", "locationPreference"],
          ["Remote preference", "remotePreference"],
          ["Salary expectations", "salaryExpectations"],
          ["Notable projects", "notableProjects"],
          ["Soft skills", "softSkills"],
          ["Career narrative", "careerNarrative"],
        ].map(([label, key]) => (
          <AuthField key={key} label={label}>
            <input
              className={authInputClassName}
              value={String(profile[key as keyof CareerProfile] ?? "")}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  [key]:
                    key === "yearsOfExperience"
                      ? Number(event.target.value)
                      : event.target.value,
                })
              }
            />
          </AuthField>
        ))}
        <AuthButton>Save profile</AuthButton>
      </form>
    </AuthCard>
  );
}
