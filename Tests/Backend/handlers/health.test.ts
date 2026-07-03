import { describe, expect, it } from "vitest";
import type { ApiHealthResponse } from "@jp/shared-types";

describe("health handler smoke", () => {
  it("matches ApiHealthResponse shape", async () => {
    const { handler } = await import("@backend/handlers/health.js");

    const result = await handler();

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body) as ApiHealthResponse;
    expect(body.status).toBe("ok");
    expect(body.service).toBe("jp-job-player");
    // Reports DB connectivity: "connected" when a database is configured
    // (e.g. CI postgres service), "not_configured" in pure local dev.
    expect(["connected", "not_configured"]).toContain(body.database);
  });
});
