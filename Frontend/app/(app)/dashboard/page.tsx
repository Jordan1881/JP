"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DashboardStats } from "@jp/shared-types";
import { resolvePipelineStages, sortStagesByPipeline } from "@jp/shared-types";
import { fetchPreferences } from "@/lib/preferences-api";
import { fetchDashboardStats } from "@/lib/profile-api";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pipelineOrder, setPipelineOrder] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchDashboardStats(), fetchPreferences()])
      .then(([nextStats, preferences]) => {
        setStats(nextStats);
        setPipelineOrder(resolvePipelineStages(preferences.stageList));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, []);

  const orderedActiveByStage = useMemo(() => {
    if (!stats) return [];
    return sortStagesByPipeline(Object.keys(stats.activeByStage), pipelineOrder).map((stage) => [stage, stats.activeByStage[stage]] as const);
  }, [pipelineOrder, stats]);

  const maxStageCount = useMemo(() => Math.max(1, ...orderedActiveByStage.map(([, c]) => c)), [orderedActiveByStage]);
  const totalActive = useMemo(() => orderedActiveByStage.reduce((s, [, c]) => s + c, 0), [orderedActiveByStage]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">All-time job search stats</p>
      {error ? <p className="mt-6 text-sm text-red-200">{error}</p> : null}
      {stats && totalActive === 0 && stats.totalApplied === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No applications tracked yet.</p>
          <Link href="/#add-job" className="mt-4 inline-flex rounded-md bg-primary px-5 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground uppercase hover:bg-white">Add your first application</Link>
        </div>
      ) : null}
      {stats ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Applied", stats.totalApplied], ["Accepted", stats.totalAccepted], ["Rejected", stats.totalRejected], ["No response", stats.totalNoResponse]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {stats && orderedActiveByStage.length > 0 ? (
        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">Active by stage</h2>
          <ul className="mt-6 space-y-4">
            {orderedActiveByStage.map(([stage, count]) => (
              <li key={stage}>
                <div className="mb-1.5 flex justify-between text-sm"><span>{stage}</span><span className="text-muted-foreground">{count}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className={cn("h-full rounded-full bg-foreground/80")} style={{ width: `${(count / maxStageCount) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
