import { describe, expect, it } from "vitest";
import type { UserType } from "@aws-sdk/client-cognito-identity-provider";
import {
  findNativeUserForLinking,
  parseFederatedUsername,
  shouldLinkExternalProvider,
} from "../../../Backend/infra/lambdas/cognito-pre-sign-up-link.logic.js";

describe("parseFederatedUsername", () => {
  it("parses Google usernames", () => {
    expect(parseFederatedUsername("Google_110105564378128368794")).toEqual({
      providerName: "Google",
      providerUserId: "110105564378128368794",
    });
  });

  it("returns null for native usernames", () => {
    expect(parseFederatedUsername("94d85438-7001-70d4-6e66-9597ec051673")).toBeNull();
  });
});

describe("findNativeUserForLinking", () => {
  it("prefers native user over federated duplicate with same email", () => {
    const users: UserType[] = [
      {
        Username: "Google_123",
        UserStatus: "EXTERNAL_PROVIDER",
        Attributes: [],
      },
      {
        Username: "04a8a4b8-3021-703e-7da6-774ecb3cd51f",
        UserStatus: "CONFIRMED",
        Attributes: [],
      },
    ];

    expect(findNativeUserForLinking(users)?.Username).toBe(
      "04a8a4b8-3021-703e-7da6-774ecb3cd51f",
    );
  });

  it("returns undefined when only federated users exist", () => {
    const users: UserType[] = [
      {
        Username: "Google_123",
        UserStatus: "EXTERNAL_PROVIDER",
        Attributes: [],
      },
    ];

    expect(findNativeUserForLinking(users)).toBeUndefined();
  });
});

describe("shouldLinkExternalProvider", () => {
  it("links only external provider sign-ups with email", () => {
    expect(
      shouldLinkExternalProvider("PreSignUp_ExternalProvider", "a@b.com"),
    ).toBe(true);
    expect(shouldLinkExternalProvider("PreSignUp_SignUp", "a@b.com")).toBe(false);
    expect(shouldLinkExternalProvider("PreSignUp_ExternalProvider", "")).toBe(
      false,
    );
  });
});
