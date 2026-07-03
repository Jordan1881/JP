"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Job } from "@jp/shared-types";
import { TERMINAL_STAGES } from "@jp/shared-types";
import { getDisplayStages } from "@jp/shared-types";
import {
  archiveJob,
  deleteJob,
  fetchJob,
  generateAnnouncement,
  generateCoverLetter,
  patchJob,
} from "@/lib/jobs-api";
import { fetchPreferences } from "@/lib/preferences-api";
import { fetchProfile } from "@/lib/profile-api";
import { cn } from "@/lib/utils";
import { FormError } from "@/components/FormError";
import { useToast } from "@/components/ToastProvider";
import { getErrorMessage } from "@/lib/feedback";

interface JobDetailViewProps {
  jobId: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const inputClassName = cn(
  "w-full rounded-md border border-border bg-input-background px-3 py-2.5",
  "text-sm font-normal text-foreground placeholder:text-muted-foreground",
  "transition-all duration-200 focus:border-white/25 focus:ring-1 focus:ring-ring focus:outline-none",
);

export function JobDetailView({ jobId }: JobDetailViewProps) {
  const { showSuccess } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [changingStage, setChangingStage] = useState<string | null>(null);
  const [stageList, setStageList] = useState<string[]>([]);
  const [profileComplete, setProfileComplete] = useState(false);
  const [revision, setRevision] = useState("");
  const [announcementRevision, setAnnouncementRevision] = useState("");
  const [generating, setGenerating] = useState(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextJob = await fetchJob(jobId);
      setJob(nextJob);
      setNotes(nextJob.notes ?? "");
      const [preferences, profile] = await Promise.all([
        fetchPreferences(),
        fetchProfile(),
      ]);
      setStageList(preferences.stageList);
      setProfileComplete(Boolean(profile?.interviewCompletedAt));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load job"));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  async function handleStageChange(stage: string) {
    if (!job || stage === job.currentStage) {
      return;
    }

    setChangingStage(stage);
    setError(null);
    try {
      const updated = await patchJob(jobId, { stage });
      setJob(updated);
      showSuccess(`Stage updated to ${stage}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update stage"));
    } finally {
      setChangingStage(null);
    }
  }

  async function handleSaveNotes() {
    if (!job) {
      return;
    }

    setSavingNotes(true);
    setError(null);
    try {
      const updated = await patchJob(jobId, { notes });
      setJob(updated);
      setNotes(updated.notes ?? "");
      showSuccess("Notes saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save notes"));
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading job…
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-sm text-muted-foreground">
          {error ?? "Job not found"}
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-foreground underline">
          Back to applications
        </Link>
      </div>
    );
  }

  const stages = getDisplayStages(job, stageList);
  const historyEntries = Object.entries(job.stageHistory).sort(
    ([, left], [, right]) => right.localeCompare(left),
  );

  return (
    <div>
      <div className="pointer-events-none fixed inset-0 grid-dots opacity-60" />
      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
        <Link
          href="/#applications"
          className="text-xs font-medium tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          ← Applications
        </Link>

        <header className="mt-6 border-b border-border pb-8">
          <p className="text-sm text-muted-foreground">{job.company}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {job.title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {job.jobNumber ? <span>#{job.jobNumber}</span> : null}
            <span>Submitted {formatDateTime(job.submissionDate)}</span>
            {job.url ? (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline-offset-4 hover:underline"
              >
                View posting
              </a>
            ) : null}
          </div>
          {job.description ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          ) : null}
        </header>

        <div className="mt-6">
          <FormError message={error} onDismiss={() => setError(null)} />
        </div>

        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Pipeline
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Jump to any stage — order is flexible.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {stages.map((stage) => {
              const isCurrent = stage === job.currentStage;
              const isTerminal = (TERMINAL_STAGES as readonly string[]).includes(
                stage,
              );
              const isChanging = changingStage === stage;

              return (
                <button
                  key={stage}
                  type="button"
                  disabled={Boolean(changingStage)}
                  onClick={() => void handleStageChange(stage)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                    isCurrent
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-secondary text-foreground hover:border-white/20",
                    isTerminal && !isCurrent && "border-white/15 text-foreground/90",
                  )}
                >
                  {isChanging ? "…" : stage}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-border bg-card/80 p-6">
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Stage history
          </h2>
          {historyEntries.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {historyEntries.map(([stage, timestamp]) => (
                <li
                  key={stage}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span
                    className={cn(
                      "font-medium",
                      stage === job.currentStage
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {stage}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDateTime(timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10 rounded-xl border border-border bg-card/80 p-6">
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Notes
          </h2>
          <textarea
            rows={5}
            className={cn(inputClassName, "mt-4 resize-y")}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Interviewer names, salary discussions, impressions…"
          />
          <button
            type="button"
            disabled={savingNotes || notes === (job.notes ?? "")}
            onClick={() => void handleSaveNotes()}
            className="mt-4 rounded-md bg-primary px-5 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground uppercase transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingNotes ? "Saving…" : "Save notes"}
          </button>
        </section>

        {job.status === "active" ? (
          <section className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Archive this job? Manual archives are permanently deleted after 30 days.",
                  )
                ) {
                  void archiveJob(jobId).then(() => {
                    window.location.href = "/archive";
                  });
                }
              }}
              className="rounded-md border border-border px-4 py-2 text-xs uppercase tracking-widest"
            >
              Archive job
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Permanently delete this job?")) {
                  void deleteJob(jobId).then(() => {
                    window.location.href = "/";
                  });
                }
              }}
              className="rounded-md border border-red-500/40 px-4 py-2 text-xs uppercase tracking-widest text-red-200"
            >
              Delete permanently
            </button>
          </section>
        ) : null}

        <section className="mt-10 rounded-xl border border-border bg-card/80 p-6">
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Cover letter
          </h2>
          <button
            type="button"
            disabled={!profileComplete || generating}
            onClick={() => {
              setGenerating(true);
              void generateCoverLetter(jobId, { action: "generate" })
                .then((result) => {
                  setJob(result.job);
                  showSuccess("Cover letter generated.");
                })
                .catch((err: unknown) =>
                  setError(getErrorMessage(err, "Generation failed")),
                )
                .finally(() => setGenerating(false));
            }}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
          >
            {profileComplete ? "Generate cover letter" : "Complete profile first"}
          </button>
          {job.coverLetter ? (
            <>
              <pre className="mt-4 whitespace-pre-wrap text-sm text-foreground">
                {job.coverLetter}
              </pre>
              <textarea
                className={cn(inputClassName, "mt-4")}
                rows={2}
                value={revision}
                onChange={(event) => setRevision(event.target.value)}
                placeholder='Revision instruction, e.g. "make it shorter"'
              />
              <button
                type="button"
                disabled={!revision.trim() || generating}
                onClick={() => {
                  setGenerating(true);
                  void generateCoverLetter(jobId, {
                    action: "revise",
                    instruction: revision,
                  })
                    .then((result) => {
                      setJob(result.job);
                      setRevision("");
                      showSuccess("Cover letter revised.");
                    })
                    .catch((err: unknown) =>
                      setError(getErrorMessage(err, "Revision failed")),
                    )
                    .finally(() => setGenerating(false));
                }}
                className="mt-3 rounded-md border border-border px-4 py-2 text-xs uppercase tracking-widest"
              >
                Revise draft
              </button>
            </>
          ) : null}
        </section>

        {job.currentStage === "Accepted" ? (
          <section className="mt-10 rounded-xl border border-border bg-card/80 p-6">
            <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              Job announcement
            </h2>
            <button
              type="button"
              disabled={!profileComplete || generating}
              onClick={() => {
                setGenerating(true);
                void generateAnnouncement(jobId, { action: "generate" })
                  .then((result) => {
                    setJob(result.job);
                    showSuccess("Announcement generated.");
                  })
                  .catch((err: unknown) =>
                    setError(getErrorMessage(err, "Generation failed")),
                  )
                  .finally(() => setGenerating(false));
              }}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
            >
              {profileComplete ? "Generate announcement" : "Complete profile first"}
            </button>
            {job.announcement ? (
              <>
                <pre className="mt-4 whitespace-pre-wrap text-sm text-foreground">
                  {job.announcement}
                </pre>
                <textarea
                  className={cn(inputClassName, "mt-4")}
                  rows={2}
                  value={announcementRevision}
                  onChange={(event) => setAnnouncementRevision(event.target.value)}
                  placeholder='Revision instruction, e.g. "make it shorter"'
                />
                <button
                  type="button"
                  disabled={!announcementRevision.trim() || generating}
                  onClick={() => {
                    setGenerating(true);
                    void generateAnnouncement(jobId, {
                      action: "revise",
                      instruction: announcementRevision,
                    })
                      .then((result) => {
                        setJob(result.job);
                        setAnnouncementRevision("");
                        showSuccess("Announcement revised.");
                      })
                      .catch((err: unknown) =>
                        setError(getErrorMessage(err, "Revision failed")),
                      )
                      .finally(() => setGenerating(false));
                  }}
                  className="mt-3 rounded-md border border-border px-4 py-2 text-xs uppercase tracking-widest"
                >
                  Revise draft
                </button>
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
