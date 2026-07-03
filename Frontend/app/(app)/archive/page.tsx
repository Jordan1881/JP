"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Job } from "@jp/shared-types";
import { deleteJob, fetchJobs, restoreJob } from "@/lib/jobs-api";

export default function ArchivePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setJobs(await fetchJobs({ status: "archived", sortOrder: "desc" }));
  }

  useEffect(() => {
    void load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Failed to load archive"),
    );
  }, []);

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-xs tracking-widest text-muted-foreground uppercase">
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">Archive</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Archived applications — manual/no-response entries expire after 30 days.
        </p>
        {error ? <p className="mt-6 text-sm text-red-200">{error}</p> : null}
        <div className="mt-8 space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link href={`/jobs/${job.id}`} className="text-lg font-medium text-foreground">
                    {job.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {job.archiveReason ?? "archived"} · {job.currentStage}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void restoreJob(job.id).then(load)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs uppercase tracking-widest"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Permanently delete this job?")) {
                        void deleteJob(job.id).then(load);
                      }
                    }}
                    className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs uppercase tracking-widest text-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archived jobs yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
