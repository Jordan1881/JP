"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CreateJobInput } from "@jp/shared-types";
import { gsap } from "@/lib/gsap";
import { createJob, importJob } from "@/lib/jobs-api";
import type { Job } from "@jp/shared-types";
import { cn } from "@/lib/utils";
import { JpLoadOverlay } from "@/components/JpLoadOverlay";
import { FormError } from "@/components/FormError";
import { useToast } from "@/components/ToastProvider";
import { getErrorMessage } from "@/lib/feedback";

type ImportMode = "url" | "text";

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
  const { showSuccess } = useToast();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("url");
  const [pastedText, setPastedText] = useState("");

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

  async function handleImport() {
    const url = form.url?.trim();
    const text = pastedText.trim();

    if (importMode === "url" && !url) {
      setError("Paste a job URL first, then click Import.");
      return;
    }
    if (importMode === "text" && !text) {
      setError("Paste the job description first, then click Import.");
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const fields = await importJob(
        importMode === "text" ? { text } : { url },
      );
      setForm((current) => ({
        ...current,
        title: fields.title,
        company: fields.company,
        url: fields.url ?? current.url ?? "",
        jobNumber: fields.jobNumber ?? current.jobNumber ?? "",
        description: fields.description ?? current.description ?? "",
        notes: fields.notes ?? current.notes ?? "",
      }));
      setExpanded(true);
      showSuccess(
        importMode === "text"
          ? "Imported job details from pasted text."
          : "Imported job details from URL.",
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          importMode === "text" ? "Failed to import from text" : "Failed to import from URL",
        ),
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
      showSuccess(`Added ${job.title} at ${job.company}.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to add job"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur-sm">
      <JpLoadOverlay
        active={importing || submitting}
        label={importing ? "Reading posting…" : "Adding job…"}
      />
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
        <div className="grid gap-2 rounded-lg border border-border bg-secondary/30 p-4 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              Auto-fill from posting
            </span>
            <div className="flex overflow-hidden rounded-md border border-border">
              {(["url", "text"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setImportMode(mode);
                    setError(null);
                  }}
                  className={cn(
                    "px-3 py-1 text-[11px] font-semibold tracking-widest uppercase transition-colors",
                    importMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode === "url" ? "URL" : "Paste text"}
                </button>
              ))}
            </div>
          </div>

          {importMode === "url" ? (
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
                onClick={() => void handleImport()}
                className={cn(
                  "shrink-0 rounded-md border border-border px-4 py-2.5 text-[11px] font-semibold tracking-widest text-foreground uppercase",
                  "transition-colors hover:border-white/20 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {importing ? "Importing…" : "Import"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                rows={4}
                placeholder="Paste the full job description here…"
                className={cn(inputClassName, "resize-y")}
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
              />
              <button
                type="button"
                disabled={importing || submitting}
                onClick={() => void handleImport()}
                className={cn(
                  "self-start rounded-md border border-border px-4 py-2.5 text-[11px] font-semibold tracking-widest text-foreground uppercase",
                  "transition-colors hover:border-white/20 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {importing ? "Importing…" : "Import from text"}
              </button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {importMode === "url"
              ? "Prefills title, company, and description. LinkedIn and other sites block automated imports — switch to Paste text, copy the posting from your browser, and import from there."
              : "Best for LinkedIn and other protected sites: open the posting in your browser, copy the full description, and paste it here."}
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

        <div className="flex flex-col gap-4 md:col-span-2">
          <FormError
            id="form-error"
            message={error}
            onDismiss={() => setError(null)}
          />
          <button
            ref={buttonRef}
            type="submit"
            disabled={submitting || importing}
            className={cn(
              "w-fit rounded-md bg-primary px-6 py-3 text-xs font-semibold tracking-widest text-primary-foreground uppercase",
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
