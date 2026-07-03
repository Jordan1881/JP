"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Job } from "@jp/shared-types";
import { buildStageFilterOptions, searchAndFilterJobs } from "@jp/shared-types";
import { StageBadge } from "@/components/StageBadge";
import {
  formatDateTimeTooltip,
  formatRelativeTime,
} from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

interface ApplicationsTableProps {
  jobs: Job[];
  stageList?: string[];
}

function scrollToAddJob() {
  document.getElementById("add-job")?.scrollIntoView({ behavior: "smooth" });
}

export function ApplicationsTable({ jobs, stageList }: ApplicationsTableProps) {
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

  const filterActive = Boolean(query.trim() || stage);
  const isEmpty = jobs.length === 0;
  const isFilteredEmpty = !isEmpty && filteredJobs.length === 0;

  return (
    <section className="rounded-xl border border-border bg-card/80 backdrop-blur-sm">
      <div className="sticky top-16 z-40 border-b border-border bg-card/95 px-6 py-5 backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-medium tracking-tight text-foreground">
              Active applications
            </h2>
            <p className="mt-1 text-sm font-normal text-muted-foreground">
              Search, filter, and open any role in your pipeline
            </p>
            {filterActive ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing {filteredJobs.length} of {jobs.length}
              </p>
            ) : null}
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
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No applications yet</p>
            <p className="mt-2 max-w-sm text-sm font-normal text-muted-foreground">
              Add your first role to start tracking your pipeline.
            </p>
            <button
              type="button"
              onClick={scrollToAddJob}
              className="mt-6 rounded-md bg-primary px-5 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground uppercase transition-colors hover:bg-white"
            >
              Add application
            </button>
          </div>
        ) : isFilteredEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No matching applications</p>
            <p className="mt-2 max-w-sm text-sm font-normal text-muted-foreground">
              Try clearing your search or stage filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStage("");
              }}
              className="mt-6 rounded-md border border-border px-5 py-2.5 text-xs font-semibold tracking-widest text-foreground uppercase transition-colors hover:bg-secondary"
            >
              Clear filters
            </button>
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
                    tabIndex={0}
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/jobs/${job.id}`);
                      }
                    }}
                    className={cn(
                      "group cursor-pointer transition-colors hover:bg-secondary/50",
                      "focus-visible:bg-secondary/50 focus-visible:outline-none",
                    )}
                  >
                    <td className="px-3 py-4 font-medium text-foreground">
                      {job.title}
                    </td>
                    <td className="px-3 py-4 font-normal text-foreground/85">{job.company}</td>
                    <td className="px-3 py-4">
                      <StageBadge stage={job.currentStage} />
                    </td>
                    <td
                      className="px-3 py-4 font-normal text-muted-foreground"
                      title={formatDateTimeTooltip(job.lastUpdatedAt)}
                    >
                      {formatRelativeTime(job.lastUpdatedAt)}
                    </td>
                    <td className="px-3 py-4">
                      {job.url ? (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
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
