"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Job } from "@jp/shared-types";
import {
  buildStageFilterOptions,
  searchAndFilterJobs,
} from "@jp/shared-types";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

interface ApplicationsTableProps {
  jobs: Job[];
  stageList?: string[];
  loading?: boolean;
  onAddJob?: () => void;
}

function stageBadgeClass(stage: string): string {
  if (stage === "Accepted") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-100";
  }
  if (stage === "Rejected") {
    return "border-red-500/40 bg-red-500/15 text-red-200";
  }
  return "border-border bg-secondary text-foreground";
}

function TableSkeleton() {
  return (
    <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading applications">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-12 animate-pulse rounded-md bg-secondary/60"
        />
      ))}
    </div>
  );
}

export function ApplicationsTable({
  jobs,
  stageList,
  loading = false,
  onAddJob,
}: ApplicationsTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");

  const filteredJobs = useMemo(
    () =>
      searchAndFilterJobs(jobs, {
        q: query || undefined,
        stage: stage || undefined,
        status: "active",
        sortOrder: "desc",
      }),
    [jobs, query, stage],
  );

  const stageOptions = useMemo(
    () => buildStageFilterOptions(stageList, jobs),
    [jobs, stageList],
  );

  const filterActive = Boolean(query || stage);
  const emptyPipeline = jobs.length === 0;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur-sm">
      <div className="sticky top-16 z-10 border-b border-border bg-card/95 px-6 py-5 backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-medium tracking-tight text-foreground">
              Active applications
            </h2>
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              {loading
                ? "Loading…"
                : filterActive
                  ? `${filteredJobs.length} of ${jobs.length} applications`
                  : `${jobs.length} application${jobs.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company, title, job #"
              className="w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground md:w-56"
            />
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              className="rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">All stages</option>
              {stageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <TableSkeleton />
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              {emptyPipeline ? "No applications yet" : "No matching applications"}
            </p>
            <p className="mt-2 max-w-sm text-sm font-normal text-muted-foreground">
              {emptyPipeline
                ? "Add your first role to start tracking your pipeline."
                : "Try clearing your search or stage filter."}
            </p>
            {emptyPipeline && onAddJob ? (
              <button
                type="button"
                onClick={onAddJob}
                className="mt-6 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground uppercase"
              >
                Add first application
              </button>
            ) : null}
          </div>
        ) : (
          <div className="-mx-2 mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Job title", "Company", "Stage", "Last updated", "Link"].map((col) => (
                    <th
                      key={col}
                      className="px-3 pb-3 text-left text-[11px] font-medium tracking-widest text-muted-foreground uppercase"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="group cursor-pointer transition-colors hover:bg-secondary/50"
                    onClick={() => router.push(`/jobs/${job.id}`)}
                  >
                    <td className="px-3 py-4 font-medium text-foreground">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="transition-colors hover:text-white"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-3 py-4 font-normal text-foreground/85">{job.company}</td>
                    <td className="px-3 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          stageBadgeClass(job.currentStage),
                        )}
                      >
                        {job.currentStage}
                      </span>
                    </td>
                    <td
                      className="px-3 py-4 font-normal text-muted-foreground"
                      title={new Date(job.lastUpdatedAt).toLocaleString()}
                    >
                      {formatRelativeTime(job.lastUpdatedAt)}
                    </td>
                    <td className="px-3 py-4">
                      {job.url ? (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          View posting
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
