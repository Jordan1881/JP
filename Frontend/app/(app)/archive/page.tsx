"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Job } from "@jp/shared-types";
import { deleteJob, fetchJobs, restoreJob } from "@/lib/jobs-api";
import { ARCHIVE_EXPIRY_DAYS, daysUntilArchiveDeletion, isPermanentArchive } from "@/lib/archive";
import { cn } from "@/lib/utils";

function expiryLabel(job: Job): string | null {
  const days = daysUntilArchiveDeletion(job);
  if (days === null) return null;
  if (days === 0) return "Deletes today";
  if (days === 1) return "1 day until deletion";
  return `${days} days until deletion`;
}

export default function ArchivePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  async function load() { setJobs(await fetchJobs({ status: "archived", sortOrder: "desc" })); }
  useEffect(() => { void load().catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load archive")); }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-foreground">Archive</h1>
      <p className="mt-2 text-sm text-muted-foreground">Accepted and rejected roles are kept permanently. Manual and no-response entries expire after {ARCHIVE_EXPIRY_DAYS} days.</p>
      {error ? <p className="mt-6 text-sm text-red-200">{error}</p> : null}
      <div className="mt-8 space-y-4">
        {jobs.map((job) => {
          const permanent = isPermanentArchive(job);
          const label = expiryLabel(job);
          return (
            <div key={job.id} className={cn("rounded-xl border bg-card p-5", permanent ? "border-border" : "border-amber-500/30")}>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/jobs/${job.id}`} className="text-lg font-medium">{job.title}</Link>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest", permanent ? "bg-secondary text-muted-foreground" : "bg-amber-500/15 text-amber-200")}>{permanent ? "Permanent" : "Expiring"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{job.archiveReason ?? "archived"} · {job.currentStage}</p>
                  {label ? <p className="mt-2 text-xs font-medium text-amber-200">{label}</p> : permanent ? <p className="mt-2 text-xs text-muted-foreground">Kept permanently</p> : null}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void restoreJob(job.id).then(load)} className="rounded-md border border-border px-3 py-1.5 text-xs uppercase tracking-widest">Restore</button>
                  <button type="button" onClick={() => { if (confirm("Permanently delete this job?")) void deleteJob(job.id).then(load); }} className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs uppercase tracking-widest text-red-200">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
        {jobs.length === 0 ? <p className="text-sm text-muted-foreground">No archived jobs yet.</p> : null}
      </div>
    </div>
  );
}
