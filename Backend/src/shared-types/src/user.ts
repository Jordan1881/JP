/** Must match docs/legal/terms-of-use.md version string. */
export const CURRENT_TERMS_VERSION = "1.0.0";

export interface UserAccount {
  userId: string;
  name: string;
  email: string;
  photoUrl?: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

export interface CreateAccountInput {
  name: string;
  email: string;
  termsVersion: string;
}

export interface UpdateAccountInput {
  name?: string;
  photoUrl?: string;
}

export interface AcceptTermsInput {
  termsVersion: string;
}

export interface DeleteAccountInput {
  confirm: true;
}

export function needsTermsReacceptance(account: UserAccount | null): boolean {
  if (!account?.termsAcceptedAt || !account.termsVersion) {
    return true;
  }
  return account.termsVersion !== CURRENT_TERMS_VERSION;
}
