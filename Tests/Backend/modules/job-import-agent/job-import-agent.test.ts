import { describe, expect, it } from "vitest";
import {
  MockClaudeClient,
  type ClaudeClient,
} from "@backend/modules/claude-api-client/index.js";
import {
  JobImportAgent,
  htmlToText,
  looksLikeBotChallenge,
  parseJobUrl,
} from "@backend/modules/job-import-agent/index.js";

class StubClaudeClient implements ClaudeClient {
  async complete(): Promise<string> {
    return JSON.stringify({
      title: "Senior Engineer",
      company: "Acme Corp",
      jobNumber: "REQ-42",
      description: "Build APIs and ship features.",
    });
  }
}

const LONG_CONTENT =
  "<html><body><h1>Senior Engineer at Acme</h1><p>We are hiring a senior engineer to build APIs and ship features across our platform.</p></body></html>";

describe("parseJobUrl", () => {
  it("accepts https URLs", () => {
    expect(parseJobUrl("https://jobs.example.com/role").href).toBe(
      "https://jobs.example.com/role",
    );
  });

  it("rejects invalid URLs", () => {
    expect(() => parseJobUrl("not-a-url")).toThrow("Invalid job URL");
  });

  it("rejects non-http schemes", () => {
    expect(() => parseJobUrl("ftp://example.com/job")).toThrow("http or https");
  });
});

describe("htmlToText", () => {
  it("strips tags and scripts", () => {
    const text = htmlToText(
      "<html><script>ignore()</script><body><h1>Engineer</h1><p>Remote</p></body></html>",
    );
    expect(text).toContain("Engineer");
    expect(text).toContain("Remote");
    expect(text).not.toContain("ignore");
  });
});

describe("looksLikeBotChallenge", () => {
  it("detects a JS challenge shell", () => {
    const html =
      '<html><head><script>winsocks();window.rbzns={};</script></head><body></body></html>';
    expect(looksLikeBotChallenge(html, htmlToText(html))).toBe(true);
  });

  it("does not flag real content", () => {
    expect(looksLikeBotChallenge(LONG_CONTENT, htmlToText(LONG_CONTENT))).toBe(
      false,
    );
  });
});

describe("JobImportAgent.importFromUrl", () => {
  it("extracts fields from fetched HTML via Claude", async () => {
    const agent = new JobImportAgent(
      new StubClaudeClient(),
      async () => LONG_CONTENT,
    );

    const fields = await agent.importFromUrl("https://jobs.acme.com/123");
    expect(fields).toMatchObject({
      title: "Senior Engineer",
      company: "Acme Corp",
      url: "https://jobs.acme.com/123",
      jobNumber: "REQ-42",
      description: "Build APIs and ship features.",
    });
    expect(fields.notes).toContain("jobs.acme.com");
  });

  it("reports a clear error for bot-challenge pages", async () => {
    const agent = new JobImportAgent(
      new StubClaudeClient(),
      async () =>
        '<html><head><script>winsocks();window.rbzns={};</script></head><body></body></html>',
    );
    await expect(
      agent.importFromUrl("https://career.rafael.co.il/job/13034/"),
    ).rejects.toThrow("blocks automated access");
  });

  it("fails when Claude returns empty title", async () => {
    class EmptyClient implements ClaudeClient {
      async complete(): Promise<string> {
        return JSON.stringify({ title: "", company: "", jobNumber: null });
      }
    }
    const agent = new JobImportAgent(new EmptyClient(), async () => LONG_CONTENT);
    await expect(
      agent.importFromUrl("https://jobs.acme.com/login"),
    ).rejects.toThrow("Could not find a job title");
  });
});

describe("JobImportAgent.importFromText", () => {
  it("extracts fields from pasted text", async () => {
    const agent = new JobImportAgent(new StubClaudeClient());
    const fields = await agent.importFromText(
      "Senior Engineer at Acme Corp. We build APIs and ship features across the platform.",
    );
    expect(fields).toMatchObject({
      title: "Senior Engineer",
      company: "Acme Corp",
      jobNumber: "REQ-42",
    });
    expect(fields.url).toBeUndefined();
    expect(fields.notes).toContain("pasted text");
  });

  it("rejects text that is too short", async () => {
    const agent = new JobImportAgent(new StubClaudeClient());
    await expect(agent.importFromText("engineer")).rejects.toThrow(
      "Paste more",
    );
  });

  it("imports Hebrew pasted text when Claude returns prose plus a json fence", async () => {
    const hebrewPosting = `משרת מפתח/ת Full Stack בחברת טכנולוגיה בע"מ
מספר משרה: 12345
אנחנו מחפשים מפתח/ת עם ניסיון ב-React, Node.js ו-TypeScript.
התפקיד כולל פיתוח מערכות web, עבודה עם צוות מוצר ותחזוקת שירותים קיימים.`;

    const client = new MockClaudeClient(() =>
      `הנה השדות שחילצתי מהמשרה:
\`\`\`json
{
  "title": "מפתח/ת Full Stack",
  "company": "חברת טכנולוגיה בע\\"מ",
  "jobNumber": "12345",
  "description": "פיתוח מערכות web עם React, Node.js ו-TypeScript."
}
\`\`\``,
    );

    const agent = new JobImportAgent(client);
    const fields = await agent.importFromText(hebrewPosting);

    expect(fields).toMatchObject({
      title: "מפתח/ת Full Stack",
      company: 'חברת טכנולוגיה בע"מ',
      jobNumber: "12345",
      description: "פיתוח מערכות web עם React, Node.js ו-TypeScript.",
    });
    expect(fields.notes).toContain("pasted text");
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0]?.input.messages[0]?.content).toContain("Pasted job description:");
  });
});
