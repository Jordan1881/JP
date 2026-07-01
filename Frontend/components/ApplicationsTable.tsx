"use client";

import { useEffect, useRef } from "react";
import type { Job } from "@jp/shared-types";
import { gsap, registerGsapPlugins } from "@/lib/gsap";

interface ApplicationsTableProps {
  jobs: Job[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ApplicationsTable({ jobs }: ApplicationsTableProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    registerGsapPlugins();
    const section = sectionRef.current;
    if (!section || jobs.length === 0) return;

    const rows = section.querySelectorAll("[data-job-row]");

    const ctx = gsap.context(() => {
      gsap.from(rows, {
        x: -12,
        opacity: 0,
        duration: 0.55,
        stagger: 0.06,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    }, section);

    return () => ctx.revert();
  }, [jobs]);

  return (
    <section
      ref={sectionRef}
      className="overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur-sm"
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Active applications
          </h2>
          <p className="mt-1 text-sm font-normal text-muted-foreground">
            Your current pipeline at a glance
          </p>
        </div>
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {jobs.length} in progress
        </p>
      </div>

      <div className="p-6 pt-0">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              No applications yet
            </p>
            <p className="mt-2 max-w-sm text-sm font-normal text-muted-foreground">
              Add your first role above to start building your pipeline.
            </p>
          </div>
        ) : (
          <div className="-mx-2 mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Job title", "Company", "Stage", "Last updated", "Link"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-3 pb-3 text-left text-[11px] font-medium tracking-widest text-muted-foreground uppercase"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    data-job-row
                    className="group transition-colors hover:bg-secondary/50"
                  >
                    <td className="px-3 py-4 font-medium text-foreground">
                      {job.title}
                    </td>
                    <td className="px-3 py-4 font-normal text-foreground/85">
                      {job.company}
                    </td>
                    <td className="px-3 py-4">
                      <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors group-hover:border-white/15">
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
                          className="text-sm font-medium text-foreground underline-offset-4 transition-opacity hover:underline"
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
