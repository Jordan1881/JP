import type { APIGatewayProxyResult } from "aws-lambda";
import type { ApiHealthResponse } from "@jp/shared-types";

export async function handler(): Promise<APIGatewayProxyResult> {
  const body: ApiHealthResponse = {
    status: "ok",
    service: "jp-job-player",
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
