import type { AgentChatMessage } from "@jp/shared-types";

export interface ClaudeCompletionInput {
  model: string;
  system: string;
  messages: AgentChatMessage[];
}

export interface ClaudeClient {
  complete(input: ClaudeCompletionInput): Promise<string>;
}

export class MockClaudeClient implements ClaudeClient {
  async complete(input: ClaudeCompletionInput): Promise<string> {
    const lastUser = [...input.messages]
      .reverse()
      .find((message) => message.role === "user");
    return `Draft based on your input: ${lastUser?.content ?? "profile data"}`;
  }
}

export class AnthropicClaudeClient implements ClaudeClient {
  constructor(private readonly apiKey: string) {}

  async complete(input: ClaudeCompletionInput): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: 1200,
        system: input.system,
        messages: input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Claude API error: ${response.status} ${body}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((block) => block.type === "text")?.text;
    if (!text) {
      throw new Error("Claude API returned no text");
    }
    return text;
  }
}

let cachedAnthropicApiKey: string | undefined;

async function fetchAnthropicApiKey(secretArn: string): Promise<string> {
  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    "@aws-sdk/client-secrets-manager"
  );
  const client = new SecretsManagerClient({});
  const result = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  if (!result.SecretString) {
    throw new Error("Anthropic secret has no string value");
  }
  let secret: { ANTHROPIC_API_KEY?: string };
  try {
    secret = JSON.parse(result.SecretString) as { ANTHROPIC_API_KEY?: string };
  } catch {
    throw new Error("Anthropic secret is not valid JSON");
  }
  const apiKey = secret.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Anthropic secret is missing ANTHROPIC_API_KEY");
  }
  return apiKey;
}

async function resolveAnthropicApiKey(secretArn: string): Promise<string> {
  cachedAnthropicApiKey ??= await fetchAnthropicApiKey(secretArn);
  return cachedAnthropicApiKey;
}

class SecretBackedClaudeClient implements ClaudeClient {
  private clientPromise: Promise<AnthropicClaudeClient> | null = null;

  constructor(private readonly secretArn: string) {}

  async complete(input: ClaudeCompletionInput): Promise<string> {
    this.clientPromise ??= resolveAnthropicApiKey(this.secretArn).then(
      (apiKey) => new AnthropicClaudeClient(apiKey),
    );
    return (await this.clientPromise).complete(input);
  }
}

export function createClaudeClient(apiKey = process.env.ANTHROPIC_API_KEY): ClaudeClient {
  if (apiKey?.trim()) {
    return new AnthropicClaudeClient(apiKey.trim());
  }

  const secretArn = process.env.ANTHROPIC_SECRET_ARN?.trim();
  if (secretArn) {
    return new SecretBackedClaudeClient(secretArn);
  }

  return new MockClaudeClient();
}

/** @internal Test helper — resets per-container secret cache. */
export function resetAnthropicSecretCacheForTests(): void {
  cachedAnthropicApiKey = undefined;
}
