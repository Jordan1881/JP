"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CreateJobInput } from "@jp/shared-types";
import { gsap } from "@/lib/gsap";
import { createJob, importJobFromUrl } from "@/lib/jobs-api";
import type { Job } from "@jp/shared-types";
import { cn } from "@/lib/utils";
import { TopLoadBar } from "@/components/TopLoadBar";

const emptyForm: CreateJobInput = {
  title: "",
  company: "",
  submissionDate: new Date().toISOString().slice(0, 10),
  jobNumber: "",
  url: "",
  description: "",
  notes: "",
};

const inputClassName = cn(
  "w-full rounded-md border border-border bg-input-background px-3 py-2.5",
  "text-sm font-normal text-foreground placeholder:text-muted-foreground",
  "transition-all duration-200 focus:border-white/25 focus:ring-1 focus:ring-ring focus:outline-none",
);

export function AddJobForm({ onJobAdded }: { onJobAdded?: (job: Job) => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!error) return;
    const el = document.getElementById("form-error");
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: -4 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
    );
  }, [error]);

  async function handleImportFromUrl() {
    const url = form.url?.trim();
    if (!url) {
      setError("Paste a job URL first, then click Import.");
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const fields = await importJobFromUrl(url);
      setForm((current) => ({
        ...current,
        title: fields.title,
        company: fields.company,
        url: fields.url,
        jobNumber: fields.jobNumber ?? current.jobNumber ?? "",
        description: fields.description ?? current.description ?? "",
        notes: fields.notes ?? current.notes ?? "",
      }));
      setExpanded(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import from URL",
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: CreateJobInput = {
      title: form.title,
      company: form.company,
      submissionDate: form.submissionDate,
      jobNumber: form.jobNumber || undefined,
      url: form.url || undefined,
      description: form.description || undefined,
      notes: form.notes || undefined,
    };

    try {
      const job = await createJob(payload);

      if (buttonRef.current) {
        gsap.fromTo(
          buttonRef.current,
          { scale: 1 },
          {
            scale: 1.04,
            duration: 0.15,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut",
          },
        );
      }

      setForm({ ...emptyForm, submissionDate: form.submissionDate });
      onJobAdded?.(job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add job");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur-sm">
      <TopLoadBar active={importing} />
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Add application
          </h2>
          <p className="mt-1 text-sm font-normal text-muted-foreground">
            Log a new role to your pipeline
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-md border border-border px-3 py-1.5 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase transition-colors hover:border-white/20 hover:text-foreground"
        >
          {expanded ? "Less fields" : "More fields"}
        </button>
      </div>

      <form className="grid gap-4 p-6 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="grid gap-1.5 md:col-span-2">
          <span className="text-sm text-muted-foreground">Job URL</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              placeholder="https://company.com/careers/role"
              className={cn(inputClassName, "min-w-0 flex-1")}
              value={form.url ?? ""}
              onChange={(event) =>
                setForm({ ...form, url: event.target.value })
              }
            />
            <button
              type="button"
              disabled={importing || submitting}
              onClick={() => void handleImportFromUrl()}
              className={cn(
                "shrink-0 rounded-md border border-border px-4 py-2.5 text-[11px] font-semibold tracking-widest text-foreground uppercase",
                "transition-colors hover:border-white/20 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste a posting link and import to prefill title, company, and
            description. Review before adding.
          </p>
        </div>

        <label className="grid gap-1.5 md:col-span-1">
          Job title *
          <input
            required
            className={inputClassName}
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
          />
        </label>
        <label className="grid gap-1.5 md:col-span-1">
          Company *
          <input
            required
            className={inputClassName}
            value={form.company}
            onChange={(event) =>
              setForm({ ...form, company: event.target.value })
            }
          />
        </label>
        <label className="grid gap-1.5 md:col-span-1">
          Resume submission date *
          <input
            required
            type="date"
            className={inputClassName}
            value={form.submissionDate}
            onChange={(event) =>
              setForm({ ...form, submissionDate: event.target.value })
            }
          />
        </label>

        {expanded ? (
          <>
            <label className="grid gap-1.5 md:col-span-1">
              Job number
              <input
                className={inputClassName}
                value={form.jobNumber ?? ""}
                onChange={(event) =>
                  setForm({ ...form, jobNumber: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 md:col-span-2">
              Description
              <textarea
                rows={3}
                className={cn(inputClassName, "resize-y")}
                value={form.description ?? ""}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 md:col-span-2">
              Notes
              <textarea
                rows={2}
                className={cn(inputClassName, "resize-y")}
                value={form.notes ?? ""}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </label>
          </>
        ) : null}

        <div className="flex flex-wrap items-center gap-4 md:col-span-2">
          {error ? (
            <p
              id="form-error"
              className="text-sm font-normal text-destructive"
            >
              {error}
            </p>
          ) : null}
          <button
            ref={buttonRef}
            type="submit"
            disabled={submitting || importing}
            className={cn(
              "rounded-md bg-primary px-6 py-3 text-xs font-semibold tracking-widest text-primary-foreground uppercase",
              "transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {submitting ? "Adding…" : "Add job"}
          </button>
        </div>
      </form>
    </section>
  );
}
