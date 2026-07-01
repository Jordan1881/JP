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

export function createClaudeClient(apiKey = process.env.ANTHROPIC_API_KEY): ClaudeClient {
  if (apiKey?.trim()) {
    return new AnthropicClaudeClient(apiKey.trim());
  }
  return new MockClaudeClient();
}
