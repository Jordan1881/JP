import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type {
  AcceptTermsInput,
  CreateAccountInput,
  DeleteAccountInput,
  UpdateAccountInput,
} from "@jp/shared-types";
import {
  acceptTerms,
  createAccount,
  deleteAccount,
  getAccount,
  mapAccountError,
  updateAccount,
} from "../application/index.js";
import { getUserId } from "./auth.js";
import { getUserAccountRepository } from "../services/store-provider.js";
import { handleLambda, requireBody } from "./transport.js";

export async function getAccountHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  return handleLambda(
    async () => getAccount(await getUserAccountRepository(), getUserId(event)),
    { mapError: mapAccountError },
  );
}

export async function createAccountHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const body = requireBody(event);
  if (typeof body !== "string") {
    return body;
  }

  const input = JSON.parse(body) as CreateAccountInput;
  return handleLambda(
    async () =>
      createAccount(await getUserAccountRepository(), getUserId(event), input),
    { successStatus: 201, mapError: mapAccountError },
  );
}

export async function updateAccountHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const body = requireBody(event);
  if (typeof body !== "string") {
    return body;
  }

  const input = JSON.parse(body) as UpdateAccountInput;
  return handleLambda(
    async () =>
      updateAccount(await getUserAccountRepository(), getUserId(event), input),
    { mapError: mapAccountError },
  );
}

export async function acceptTermsHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const body = requireBody(event);
  if (typeof body !== "string") {
    return body;
  }

  const input = JSON.parse(body) as AcceptTermsInput;
  return handleLambda(
    async () =>
      acceptTerms(await getUserAccountRepository(), getUserId(event), input),
    { mapError: mapAccountError },
  );
}

export async function deleteAccountHandler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const body = requireBody(event);
  if (typeof body !== "string") {
    return body;
  }

  const input = JSON.parse(body) as DeleteAccountInput;
  return handleLambda(
    async () =>
      deleteAccount(await getUserAccountRepository(), getUserId(event), input),
    { mapError: mapAccountError },
  );
}
