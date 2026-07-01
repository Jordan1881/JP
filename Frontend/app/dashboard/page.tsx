"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DashboardStats } from "@jp/shared-types";
import { fetchDashboardStats } from "@/lib/profile-api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchDashboardStats()
      .then(setStats)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load dashboard"),
      );
  }, []);

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-xs tracking-widest text-muted-foreground uppercase">
          ← Home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">All-time job search stats</p>

        {error ? <p className="mt-6 text-sm text-red-200">{error}</p> : null}

        {stats ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Applied", stats.totalApplied],
              ["Accepted", stats.totalAccepted],
              ["Rejected", stats.totalRejected],
              ["No response", stats.totalNoResponse],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs tracking-widest text-muted-foreground uppercase">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {stats ? (
          <section className="mt-10 rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              Active by stage
            </h2>
            <ul className="mt-4 space-y-2">
              {Object.entries(stats.activeByStage).map(([stage, count]) => (
                <li key={stage} className="flex justify-between text-sm">
                  <span className="text-foreground">{stage}</span>
                  <span className="text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
