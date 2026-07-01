"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CreateJobInput } from "@jp/shared-types";

const emptyForm: CreateJobInput = {
  title: "",
  company: "",
  submissionDate: new Date().toISOString().slice(0, 10),
  jobNumber: "",
  url: "",
  description: "",
  notes: "",
};

export function AddJobForm() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Failed to add job");
      setSubmitting(false);
      return;
    }

    setForm({ ...emptyForm, submissionDate: form.submissionDate });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <section className="panel">
      <h2>Add application</h2>
      <form className="job-form" onSubmit={handleSubmit}>
        <label>
          Job title *
          <input
            required
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
          />
        </label>
        <label>
          Company *
          <input
            required
            value={form.company}
            onChange={(event) =>
              setForm({ ...form, company: event.target.value })
            }
          />
        </label>
        <label>
          Resume submission date *
          <input
            required
            type="date"
            value={form.submissionDate}
            onChange={(event) =>
              setForm({ ...form, submissionDate: event.target.value })
            }
          />
        </label>
        <label>
          Job number
          <input
            value={form.jobNumber ?? ""}
            onChange={(event) =>
              setForm({ ...form, jobNumber: event.target.value })
            }
          />
        </label>
        <label>
          Job URL
          <input
            type="url"
            placeholder="https://"
            value={form.url ?? ""}
            onChange={(event) => setForm({ ...form, url: event.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            rows={3}
            value={form.description ?? ""}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
        </label>
        <label>
          Notes
          <textarea
            rows={2}
            value={form.notes ?? ""}
            onChange={(event) =>
              setForm({ ...form, notes: event.target.value })
            }
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add job"}
        </button>
      </form>
    </section>
  );
}
