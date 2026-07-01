import type {
  AcceptTermsInput,
  CreateAccountInput,
  DeleteAccountInput,
  UpdateAccountInput,
  UserAccount,
} from "@jp/shared-types";
import { authHeaders } from "./auth";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export async function fetchAccount(): Promise<UserAccount | null> {
  const response = await fetch("/api/account", {
    headers: await authHeaders(),
  });
  if (response.status === 404) {
    return null;
  }
  const data = await parseJson<{ account: UserAccount }>(response);
  return data.account;
}

export async function createAccount(input: CreateAccountInput): Promise<UserAccount> {
  const response = await fetch("/api/account", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ account: UserAccount }>(response);
  return data.account;
}

export async function updateAccount(input: UpdateAccountInput): Promise<UserAccount> {
  const response = await fetch("/api/account", {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ account: UserAccount }>(response);
  return data.account;
}

export async function acceptTerms(input: AcceptTermsInput): Promise<UserAccount> {
  const response = await fetch("/api/account/accept-terms", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ account: UserAccount }>(response);
  return data.account;
}

export async function deleteAccount(): Promise<void> {
  const body: DeleteAccountInput = { confirm: true };
  const response = await fetch("/api/account", {
    method: "DELETE",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  await parseJson<{ deleted: boolean }>(response);
}
