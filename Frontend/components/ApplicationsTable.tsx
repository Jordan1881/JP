"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Job } from "@jp/shared-types";
import { searchAndFilterJobs } from "@jp/backend";

interface ApplicationsTableProps {
  jobs: Job[];
  stages?: string[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ApplicationsTable({ jobs, stages = [] }: ApplicationsTableProps) {
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

  const stageOptions = useMemo(() => {
    const fromJobs = jobs.map((job) => job.currentStage);
    return [...new Set([...stages, ...fromJobs])].sort();
  }, [jobs, stages]);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur-sm">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Active applications
          </h2>
          <p className="mt-1 text-sm font-normal text-muted-foreground">
            Search, filter, and open any role in your pipeline
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

      <div className="p-6 pt-0">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No matching applications</p>
            <p className="mt-2 max-w-sm text-sm font-normal text-muted-foreground">
              Try clearing your search or stage filter.
            </p>
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
                  <tr key={job.id} className="group transition-colors hover:bg-secondary/50">
                    <td className="px-3 py-4 font-medium text-foreground">
                      <Link href={`/jobs/${job.id}`} className="transition-colors hover:text-white">
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-3 py-4 font-normal text-foreground/85">{job.company}</td>
                    <td className="px-3 py-4">
                      <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">
                        {job.currentStage}
                      </span>
                    </td>
                    <td className="px-3 py-4 font-normal text-muted-foreground">
                      {formatDate(job.lastUpdatedAt)}
                    </td>
                    <td className="px-3 py-4">
                      {job.url ? (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
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
