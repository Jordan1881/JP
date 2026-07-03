import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CLAUDE_MODELS,
  MockClaudeClient,
  createClaudeClient,
  parseStructuredOutput,
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
    vi.restoreAllMocks();
  });

  it("throws when no key or secret ARN is configured", () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_SECRET_ARN;

    expect(() => createClaudeClient()).toThrow(
      "Set ANTHROPIC_API_KEY (local dev) or ANTHROPIC_SECRET_ARN (Lambda)",
    );
  });

  it("uses explicit api key parameter over environment", () => {
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
      client.complete("generation", {
        system: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).resolves.toBe("generated");

    expect(send).toHaveBeenCalledOnce();
    const [, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(requestInit.body as string) as { model: string };
    expect(body.model).toBe(CLAUDE_MODELS.generation);
    fetchSpy.mockRestore();
  });

  it("selects interview-tier model for interview calls", async () => {
    const client = createClaudeClient("sk-ant-test");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "question" }],
        }),
        { status: 200 },
      ),
    );

    await client.complete("interview", {
      system: "test",
      messages: [{ role: "user", content: "start" }],
    });

    const [, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(requestInit.body as string) as { model: string };
    expect(body.model).toBe(CLAUDE_MODELS.interview);
    fetchSpy.mockRestore();
  });

  it("selects generation-tier model for generation calls", async () => {
    const client = createClaudeClient("sk-ant-test");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "draft" }],
        }),
        { status: 200 },
      ),
    );

    await client.complete("generation", {
      system: "test",
      messages: [{ role: "user", content: "hi" }],
    });

    const [, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(requestInit.body as string) as { model: string };
    expect(body.model).toBe(CLAUDE_MODELS.generation);
    fetchSpy.mockRestore();
  });

  it("retries on transient 429 responses", async () => {
    const client = createClaudeClient("sk-ant-test");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [{ type: "text", text: "ok after retry" }],
          }),
          { status: 200 },
        ),
      );

    await expect(
      client.complete("generation", {
        system: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).resolves.toBe("ok after retry");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it("retries on transient 500 responses", async () => {
    const client = createClaudeClient("sk-ant-test");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("server error", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [{ type: "text", text: "ok after retry" }],
          }),
          { status: 200 },
        ),
      );

    await expect(
      client.complete("generation", {
        system: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).resolves.toBe("ok after retry");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it("throws when secret ARN is set but secret fetch fails", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_SECRET_ARN = "arn:aws:secretsmanager:us-east-1:1:secret:test";

    send.mockRejectedValue(new Error("access denied"));

    const client = createClaudeClient();
    await expect(
      client.complete("generation", {
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
      client.complete("generation", {
        system: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("missing ANTHROPIC_API_KEY");
  });
});



describe("MockClaudeClient", () => {
  it("returns programmed responses without network calls", async () => {
    const client = new MockClaudeClient((tier, input) => {
      expect(tier).toBe("generation");
      expect(input.messages[0]?.content).toBe("hi");
      return "mocked draft";
    });

    await expect(
      client.complete("generation", {
        system: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).resolves.toBe("mocked draft");

    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]?.tier).toBe("generation");
  });
});

describe("parseStructuredOutput", () => {
  it("parses raw JSON", () => {
    expect(parseStructuredOutput<{ techStack: string[] }>('{"techStack":["Go"]}')).toEqual({
      techStack: ["Go"],
    });
  });

  it("parses fenced JSON blocks", () => {
    const raw = '```json\n{"seniority":"Senior"}\n```';
    expect(parseStructuredOutput<{ seniority: string }>(raw)).toEqual({
      seniority: "Senior",
    });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseStructuredOutput("not json")).toThrow("not valid JSON");
  });
});
