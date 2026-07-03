import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createClaudeClient,
  MockClaudeClient,
  resetAnthropicSecretCacheForTests,
} from "@backend/modules/claude-api-client/index.js";

const send = vi.fn();

vi.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: vi.fn(() => ({ send })),
  GetSecretValueCommand: vi.fn((input: unknown) => input),
}));

describe("createClaudeClient", () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  const originalSecretArn = process.env.ANTHROPIC_SECRET_ARN;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
    if (originalSecretArn === undefined) {
      delete process.env.ANTHROPIC_SECRET_ARN;
    } else {
      process.env.ANTHROPIC_SECRET_ARN = originalSecretArn;
    }
    resetAnthropicSecretCacheForTests();
    send.mockReset();
  });

  it("returns mock client when no key or secret ARN is configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_SECRET_ARN;

    const client = createClaudeClient();
    expect(client).toBeInstanceOf(MockClaudeClient);
    await expect(
      client.complete({
        model: "claude-sonnet-4-20250514",
        system: "test",
        messages: [{ role: "user", content: "hello" }],
      }),
    ).resolves.toContain("hello");
  });

  it("uses explicit api key parameter over environment", async () => {
    const client = createClaudeClient("sk-ant-explicit");
    expect(client.constructor.name).toBe("AnthropicClaudeClient");
  });

  it("resolves api key from secrets manager when ARN is set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:1:secret:test";

    send.mockResolvedValue({
      SecretString: JSON.stringify({ ANTHROPIC_API_KEY: "sk-ant-from-secret" }),
    });

    const client = createClaudeClient();
    expect(client.constructor.name).toBe("SecretBackedClaudeClient");
    expect(send).not.toHaveBeenCalled();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "generated" }],
        }),
        { status: 200 },
      ),
    );

    await expect(
      client.complete({
        model: "claude-sonnet-4-20250514",
        system: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).resolves.toBe("generated");

    expect(send).toHaveBeenCalledOnce();
    fetchSpy.mockRestore();
  });

  it("throws when secret ARN is set but secret fetch fails", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:1:secret:test";

    send.mockRejectedValue(new Error("access denied"));

    const client = createClaudeClient();
    await expect(
      client.complete({
        model: "claude-sonnet-4-20250514",
        system: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("access denied");
  });

  it("throws when secret JSON is missing ANTHROPIC_API_KEY", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:1:secret:test";

    send.mockResolvedValue({
      SecretString: JSON.stringify({ OTHER_FIELD: "nope" }),
    });

    const client = createClaudeClient();
    await expect(
      client.complete({
        model: "claude-sonnet-4-20250514",
        system: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("missing ANTHROPIC_API_KEY");
  });
});
