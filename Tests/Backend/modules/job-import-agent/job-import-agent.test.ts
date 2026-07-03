import { describe, expect, it } from "vitest";
import type { ClaudeClient } from "@backend/modules/claude-api-client/index.js";
import {
  JobImportAgent,
  htmlToText,
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
    expect(() => parseJobUrl("ftp://example.com/job")).toThrow(
      "http or https",
    );
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

describe("JobImportAgent", () => {
  it("extracts fields from fetched HTML via Claude", async () => {
    const agent = new JobImportAgent(new StubClaudeClient(), async () =>
      "<html><body><h1>Senior Engineer at Acme</h1><p>We are hiring a senior engineer to build APIs and ship features across our platform.</p></body></html>",
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

  it("fails when page text is too short", async () => {
    const agent = new JobImportAgent(new StubClaudeClient(), async () => "<p>Hi</p>");
    await expect(
      agent.importFromUrl("https://jobs.acme.com/empty"),
    ).rejects.toThrow("Could not read enough content");
  });

  it("fails when Claude returns empty title", async () => {
    class EmptyClient implements ClaudeClient {
      async complete(): Promise<string> {
        return JSON.stringify({ title: "", company: "", jobNumber: null });
      }
    }
    const agent = new JobImportAgent(new EmptyClient(), async () =>
      "<html><body>" + "x".repeat(80) + "</body></html>",
    );
    await expect(agent.importFromUrl("https://jobs.acme.com/login")).rejects.toThrow(
      "Could not find a job title",
    );
  });
});
