import type { APIGatewayProxyResult } from "aws-lambda";
import type { ApiHealthResponse } from "@jp/shared-types";
import { getPool } from "../services/store-provider.js";

async function checkDatabase(): Promise<ApiHealthResponse["database"]> {
  try {
    const pool = await getPool();
    if (!pool) {
      return "not_configured";
    }
    await pool.query("SELECT 1");
    return "connected";
  } catch {
    return "error";
  }
}

export async function handler(): Promise<APIGatewayProxyResult> {
  const body: ApiHealthResponse = {
    status: "ok",
    service: "jp-job-player",
    database: await checkDatabase(),
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
