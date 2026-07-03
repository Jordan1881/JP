import type { AgentChatMessage } from "@jp/shared-types";

export type ClaudeAgentTier = "interview" | "generation";

/** Central model map — agents pass a tier, not a raw model id. */
export const CLAUDE_MODELS: Record<ClaudeAgentTier, string> = {
  interview: "claude-opus-4-8",
  generation: "claude-sonnet-5",
};

export interface ClaudeCompletionInput {
  system: string;
  messages: AgentChatMessage[];
}

export interface ClaudeClient {
  complete(tier: ClaudeAgentTier, input: ClaudeCompletionInput): Promise<string>;
}

const MAX_ATTEMPTS = 4;
const INITIAL_BACKOFF_MS = 250;

function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function backoffMs(attempt: number): number {
  return INITIAL_BACKOFF_MS * 2 ** attempt;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AnthropicClaudeClient implements ClaudeClient {
  constructor(private readonly apiKey: string) {}

  async complete(
    tier: ClaudeAgentTier,
    input: ClaudeCompletionInput,
  ): Promise<string> {
    const model = CLAUDE_MODELS[tier];
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
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
          const error = new Error(`Claude API error: ${response.status} ${body}`);
          if (isTransientStatus(response.status) && attempt < MAX_ATTEMPTS - 1) {
            lastError = error;
            await sleep(backoffMs(attempt));
            continue;
          }
          throw error;
        }

        const data = (await response.json()) as {
          content?: Array<{ type: string; text?: string }>;
        };
        const text = data.content?.find((block) => block.type === "text")?.text;
        if (!text) {
          throw new Error("Claude API returned no text");
        }
        return text;
      } catch (error) {
        const isNetwork =
          error instanceof TypeError ||
          (error instanceof Error && error.message.includes("fetch"));
        if (isNetwork && attempt < MAX_ATTEMPTS - 1) {
          lastError = error instanceof Error ? error : new Error(String(error));
          await sleep(backoffMs(attempt));
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error("Claude API request failed after retries");
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

  async complete(
    tier: ClaudeAgentTier,
    input: ClaudeCompletionInput,
  ): Promise<string> {
    this.clientPromise ??= resolveAnthropicApiKey(this.secretArn).then(
      (apiKey) => new AnthropicClaudeClient(apiKey),
    );
    return (await this.clientPromise).complete(tier, input);
  }
}

const MISSING_CREDENTIALS_MESSAGE =
  "Anthropic API credentials are required. Set ANTHROPIC_API_KEY (local dev) or ANTHROPIC_SECRET_ARN (Lambda).";

export function createClaudeClient(apiKey = process.env.ANTHROPIC_API_KEY): ClaudeClient {
  if (apiKey?.trim()) {
    return new AnthropicClaudeClient(apiKey.trim());
  }

  const secretArn = process.env.ANTHROPIC_SECRET_ARN?.trim();
  if (secretArn) {
    return new SecretBackedClaudeClient(secretArn);
  }

  throw new Error(MISSING_CREDENTIALS_MESSAGE);
}

/**
 * Parse structured JSON from Claude text or tool-use output (e.g. save_profile_data).
 * Strips optional markdown fences before parsing.
 */
export function parseStructuredOutput<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = (fenced?.[1] ?? trimmed).trim();

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    throw new Error("Claude structured output is not valid JSON");
  }
}



export type MockClaudeResponder = (
  tier: ClaudeAgentTier,
  input: ClaudeCompletionInput,
) => string | Promise<string>;

/** Programmable Claude client for unit tests — no network calls. */
export class MockClaudeClient implements ClaudeClient {
  readonly calls: Array<{ tier: ClaudeAgentTier; input: ClaudeCompletionInput }> = [];

  constructor(private readonly responder: MockClaudeResponder) {}

  async complete(
    tier: ClaudeAgentTier,
    input: ClaudeCompletionInput,
  ): Promise<string> {
    this.calls.push({ tier, input });
    return this.responder(tier, input);
  }
}

/** @internal Test helper — resets per-container secret cache. */
export function resetAnthropicSecretCacheForTests(): void {
  cachedAnthropicApiKey = undefined;
}
