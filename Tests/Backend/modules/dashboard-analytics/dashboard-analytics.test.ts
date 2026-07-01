import { describe, expect, it } from "vitest";
import { computeDashboardStats } from "@backend/modules/dashboard-analytics/index.js";

describe("DashboardAnalytics", () => {
  it("aggregates totals and active stage counts", () => {
    const stats = computeDashboardStats([
      {
        id: "1",
        userId: "u1",
        title: "A",
        company: "Acme",
        submissionDate: "2026-01-01T00:00:00.000Z",
        currentStage: "Offer",
        stageHistory: {},
        status: "active",
        lastUpdatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "2",
        userId: "u1",
        title: "B",
        company: "Beta",
        submissionDate: "2026-01-01T00:00:00.000Z",
        currentStage: "Accepted",
        stageHistory: {},
        status: "archived",
        archiveReason: "accepted",
        archivedAt: "2026-02-01T00:00:00.000Z",
        lastUpdatedAt: "2026-02-01T00:00:00.000Z",
      },
    ]);

    expect(stats.totalApplied).toBe(2);
    expect(stats.totalAccepted).toBe(1);
    expect(stats.activeByStage.Offer).toBe(1);
  });
});
