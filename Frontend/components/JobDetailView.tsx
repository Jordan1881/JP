"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Job } from "@jp/shared-types";
import { TERMINAL_STAGES, getDisplayStages } from "@jp/shared-types";
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { JpLoader } from "@/components/JpLoader";
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
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [generatingAnnouncement, setGeneratingAnnouncement] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);

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
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesDirty = job ? notes !== (job.notes ?? "") : false;

  useEffect(() => {
    if (!job || notes === (job.notes ?? "")) {
      return;
    }
    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
    }
    notesDebounceRef.current = setTimeout(() => {
      void handleSaveNotes();
    }, 800);
    return () => {
      if (notesDebounceRef.current) {
        clearTimeout(notesDebounceRef.current);
      }
    };
  }, [notes, job]);


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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <JpLoader size="md" label="Loading job…" />
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
  const historyCollapsedByDefault = historyEntries.length > 5;
  const displayedHistory =
    historyExpanded || !historyCollapsedByDefault
      ? historyEntries
      : historyEntries.slice(0, 5);

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
          <div className="mt-5 flex items-center gap-1 overflow-x-auto pb-2">
            {stages.map((stage, index) => {
              const isCurrent = stage === job.currentStage;
              const currentIndex = stages.indexOf(job.currentStage);
              const isPast = stage in job.stageHistory && stage !== job.currentStage;
              const isTerminal = (TERMINAL_STAGES as readonly string[]).includes(stage);
              const isAccepted = stage === "Accepted";
              const isRejected = stage === "Rejected";
              const isChanging = changingStage === stage;

              return (
                <div key={stage} className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={Boolean(changingStage)}
                    onClick={() => void handleStageChange(stage)}
                    className={cn(
                      "flex min-w-[4.5rem] flex-col items-center gap-1.5 px-2 py-1 transition-colors disabled:opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                        isCurrent && isAccepted
                          ? "border-emerald-400 bg-emerald-400 text-black"
                          : isCurrent && isRejected
                            ? "border-muted-foreground bg-muted text-background"
                            : isCurrent
                              ? "border-foreground bg-foreground text-background"
                              : isPast && isAccepted
                                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-100"
                                : isPast && isRejected
                                  ? "border-border bg-muted/40 text-muted-foreground"
                                  : isPast
                                    ? "border-emerald-500/50 bg-emerald-500/20 text-foreground"
                                    : isTerminal
                                      ? "border-white/15 bg-secondary/60 text-muted-foreground"
                                      : "border-border bg-secondary text-muted-foreground",
                      )}
                    >
                      {isChanging ? "…" : index + 1}
                    </span>
                    <span
                      className={cn(
                        "max-w-[5rem] truncate text-center text-[10px] leading-tight",
                        isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {stage}
                    </span>
                  </button>
                  {index < stages.length - 1 ? (
                    <div
                      className={cn(
                        "mx-0.5 h-0.5 w-4 shrink-0 rounded",
                        index < currentIndex ? "bg-emerald-500/50" : "bg-border",
                      )}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-border bg-card/80 p-6">
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Stage history
            {historyEntries.length > 0 ? (
              <span className="ml-2 font-normal normal-case text-muted-foreground">
                ({historyEntries.length})
              </span>
            ) : null}
          </h2>
          {historyEntries.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {displayedHistory.map(([stage, timestamp]) => (
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
              {historyCollapsedByDefault ? (
                <button
                  type="button"
                  onClick={() => setHistoryExpanded((value) => !value)}
                  className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
                >
                  {historyExpanded
                    ? "Show less"
                    : `Show all ${historyEntries.length} entries`}
                </button>
              ) : null}
            </>
          )}
        </section>

        <section className="mt-10 rounded-xl border border-border bg-card/80 p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              Notes
            </h2>
            {notesDirty ? (
              <span className="text-xs text-amber-200/90">Unsaved changes</span>
            ) : null}
          </div>
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
              onClick={() => setConfirmAction("archive")}
              className="rounded-md border border-border px-4 py-2 text-xs uppercase tracking-widest"
            >
              Archive job
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction("delete")}
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
            disabled={!profileComplete || generatingCoverLetter}
            onClick={() => {
              setGeneratingCoverLetter(true);
              void generateCoverLetter(jobId, { action: "generate" })
                .then((result) => {
                  setJob(result.job);
                  showSuccess("Cover letter generated.");
                })
                .catch((err: unknown) =>
                  setError(getErrorMessage(err, "Generation failed")),
                )
                .finally(() => setGeneratingCoverLetter(false));
            }}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
          >
            {profileComplete ? (generatingCoverLetter ? "Generating…" : "Generate cover letter") : "Complete profile first"}
          </button>
          {job.coverLetter ? (
            <>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(job.coverLetter ?? "")}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Copy to clipboard
                </button>
              </div>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground">
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
                disabled={!revision.trim() || generatingCoverLetter}
                onClick={() => {
                  setGeneratingCoverLetter(true);
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
                    .finally(() => setGeneratingCoverLetter(false));
                }}
                className="mt-3 rounded-md border border-border px-4 py-2 text-xs uppercase tracking-widest"
              >
                Revise draft
              </button>
            </>
          ) : null}
        </section>

        {job.currentStage === "Accepted" ? (
          <section className="mt-10 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
            <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              Job announcement
            </h2>
            <button
              type="button"
              disabled={!profileComplete || generatingAnnouncement}
              onClick={() => {
                setGeneratingAnnouncement(true);
                void generateAnnouncement(jobId, { action: "generate" })
                  .then((result) => {
                    setJob(result.job);
                    showSuccess("Announcement generated.");
                  })
                  .catch((err: unknown) =>
                    setError(getErrorMessage(err, "Generation failed")),
                  )
                  .finally(() => setGeneratingAnnouncement(false));
              }}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
            >
              {profileComplete ? (generatingAnnouncement ? "Generating…" : "Generate announcement") : "Complete profile first"}
            </button>
            {job.announcement ? (
              <>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(job.announcement ?? "")}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Copy to clipboard
                  </button>
                </div>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-foreground">
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
                  disabled={!announcementRevision.trim() || generatingAnnouncement}
                  onClick={() => {
                    setGeneratingAnnouncement(true);
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
                      .finally(() => setGeneratingAnnouncement(false));
                  }}
                  className="mt-3 rounded-md border border-border px-4 py-2 text-xs uppercase tracking-widest"
                >
                  Revise draft
                </button>
              </>
            ) : null}
          </section>
        ) : null}

        <ConfirmDialog
          open={confirmAction === "archive"}
          title="Archive this job?"
          description="Manual archives are permanently deleted after 30 days."
          confirmLabel="Archive"
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            setConfirmAction(null);
            void archiveJob(jobId).then(() => {
              window.location.href = "/archive";
            });
          }}
        />
        <ConfirmDialog
          open={confirmAction === "delete"}
          title="Delete permanently?"
          description="This cannot be undone."
          confirmLabel="Delete"
          destructive
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            setConfirmAction(null);
            void deleteJob(jobId).then(() => {
              window.location.href = "/";
            });
          }}
        />
      </div>
    </div>
  );
}