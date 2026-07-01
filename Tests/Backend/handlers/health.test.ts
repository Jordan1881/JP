import { describe, expect, it } from "vitest";
import type { ApiHealthResponse } from "@jp/shared-types";

describe("health handler smoke", () => {
  it("matches ApiHealthResponse shape", async () => {
    const { handler } = await import("@backend/handlers/health.js");

    const result = await handler();

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body) as ApiHealthResponse;
    expect(body).toEqual({ status: "ok", service: "jp-job-player" });
  });
});
