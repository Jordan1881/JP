import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type {
  AcceptTermsInput,
  CreateAccountInput,
  DeleteAccountInput,
  UpdateAccountInput,
} from "@jp/shared-types";
import { getUserId } from "./auth.js";
import { getDevUserAccountRepository } from "../modules/user-account/factory.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

function mapError(error: unknown): APIGatewayProxyResult {
  const message =
    error instanceof Error ? error.message : "Account request failed";
  const statusCode =
    message.includes("required") ||
    message.includes("must be") ||
    message.includes("not found") ||
    message.includes("already exists") ||
    message.includes("confirmation")
      ? 400
      : 500;
  return response(statusCode, { error: message });
}

export async function getAccountHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  try {
    const account = await getDevUserAccountRepository().get(getUserId(event));
    if (!account) {
      return response(404, { error: "Account not found" });
    }
    return response(200, { account });
  } catch (error) {
    return mapError(error);
  }
}

export async function createAccountHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const input = JSON.parse(event.body) as CreateAccountInput;
    const account = await getDevUserAccountRepository().create(
      getUserId(event),
      input,
    );
    return response(201, { account });
  } catch (error) {
    return mapError(error);
  }
}

export async function updateAccountHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const input = JSON.parse(event.body) as UpdateAccountInput;
    const account = await getDevUserAccountRepository().update(
      getUserId(event),
      input,
    );
    return response(200, { account });
  } catch (error) {
    return mapError(error);
  }
}

export async function acceptTermsHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const input = JSON.parse(event.body) as AcceptTermsInput;
    const account = await getDevUserAccountRepository().acceptTerms(
      getUserId(event),
      input,
    );
    return response(200, { account });
  } catch (error) {
    return mapError(error);
  }
}

export async function deleteAccountHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { error: "Request body is required" });
  }

  try {
    const input = JSON.parse(event.body) as DeleteAccountInput;
    if (input.confirm !== true) {
      return response(400, { error: "Account deletion requires confirmation" });
    }
    await getDevUserAccountRepository().delete(getUserId(event));
    return response(200, { deleted: true });
  } catch (error) {
    return mapError(error);
  }
}
