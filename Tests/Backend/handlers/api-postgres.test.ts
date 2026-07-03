import { beforeAll, describe, expect, it } from "vitest";
import type { APIGatewayProxyEvent } from "aws-lambda";
import type pg from "pg";
import type { Job } from "@jp/shared-types";
import { handler } from "@backend/handlers/api.js";
import { getPool } from "@backend/services/store-provider.js";

const databaseConfigured = Boolean(
  process.env.DATABASE_URL || process.env.DATABASE_HOST,
);

const USER = "pg-api-user";

function event(
  method: string,
  path: string,
  body?: unknown,
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    path,
    body: body === undefined ? null : JSON.stringify(body),
    headers: { "x-user-id": USER },
    queryStringParameters: null,
    requestContext: {},
  } as unknown as APIGatewayProxyEvent;
}

// Integration test — proves the store provider routes the monolithic
// ApiHandler to Postgres when a database is configured (issue #43).
describe.skipIf(!databaseConfigured)("ApiHandler on Postgres", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    const maybePool = await getPool();
    if (!maybePool) {
      throw new Error("Store provider returned no pool despite env gate");
    }
    pool = maybePool;
    await pool.query("DELETE FROM jobs WHERE user_id = $1", [USER]);
  });

  // No afterAll pool.end(): the provider owns this shared pool and the vitest
  // worker exits after the run.

  it("persists a created job and lists it back", async () => {
    const createResult = await handler(
      event("POST", "/jobs", {
        title: "Platform Engineer",
        company: "Acme Cloud",
        submissionDate: "2026-02-01",
      }),
    );
    expect(createResult.statusCode).toBe(201);
    const created = (JSON.parse(createResult.body) as { job: Job }).job;

    const listResult = await handler(event("GET", "/jobs"));
    expect(listResult.statusCode).toBe(200);
    const { jobs } = JSON.parse(listResult.body) as { jobs: Job[] };
    expect(jobs.map((job) => job.id)).toContain(created.id);

    const { rows } = await pool.query(
      "SELECT title FROM jobs WHERE id = $1",
      [created.id],
    );
    expect(rows[0]?.title).toBe("Platform Engineer");
  });

  it("reports database connectivity on /health", async () => {
    const result = await handler(event("GET", "/health"));
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).database).toBe("connected");
  });
});
