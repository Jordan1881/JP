import type {
  AcceptTermsInput,
  CreateAccountInput,
  DeleteAccountInput,
  UpdateAccountInput,
} from "@jp/shared-types";
import type { UserAccountRepository } from "../modules/user-account/index.js";
import { ApplicationError } from "./errors.js";

export async function getAccount(
  repository: UserAccountRepository,
  userId: string,
) {
  const account = await repository.get(userId);
  if (!account) {
    throw new ApplicationError("Account not found", 404);
  }
  return { account };
}

export async function createAccount(
  repository: UserAccountRepository,
  userId: string,
  input: CreateAccountInput,
) {
  const account = await repository.create(userId, input);
  return { account };
}

export async function updateAccount(
  repository: UserAccountRepository,
  userId: string,
  input: UpdateAccountInput,
) {
  const account = await repository.update(userId, input);
  return { account };
}

export async function acceptTerms(
  repository: UserAccountRepository,
  userId: string,
  input: AcceptTermsInput,
) {
  const account = await repository.acceptTerms(userId, input);
  return { account };
}

export async function deleteAccount(
  repository: UserAccountRepository,
  userId: string,
  input: DeleteAccountInput,
) {
  if (input.confirm !== true) {
    throw new ApplicationError("Account deletion requires confirmation", 400);
  }
  await repository.delete(userId);
  return { deleted: true as const };
}
