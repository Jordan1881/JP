import type { JobImportFromUrlResult } from "@jp/shared-types";
import type { ClaudeClient } from "../claude-api-client/index.js";
import { parseStructuredOutput } from "../claude-api-client/index.js";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 512_000;
const MAX_TEXT_CHARS = 24_000;

const EXTRACT_SYSTEM = `You extract job application fields from a job posting web page.
Return JSON only:
{
  "title": string,
  "company": string,
  "jobNumber": string | null,
  "description": string | null
}

Rules:
- title and company are required — infer from page content, <title>, or URL hostname when needed
- description: plain-text summary of role, requirements, and responsibilities (max ~2000 chars)
- jobNumber: requisition / job ID if explicitly shown, otherwise null
- Do not invent salary, benefits, or details not on the page
- If the page is a login wall or unrelated, set title and company to empty strings`;

type ExtractedFields = {
  title?: string;
  company?: string;
  jobNumber?: string | null;
  description?: string | null;
};

export function parseJobUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Job URL is required");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid job URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Job URL must use http or https");
  }
  return parsed;
}

/** Strip HTML to plain text for Claude (MVP — no headless browser). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchJobPageHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url.href, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; JP-JobPlayer/1.0; +https://github.com/Jordan1881/JP)",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(
        `Could not fetch this URL (HTTP ${response.status}). Try filling in the form manually.`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error(
        "This URL does not look like a web page. Try filling in the form manually.",
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) {
      throw new Error(
        "This page is too large to import. Try filling in the form manually.",
      );
    }

    return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Timed out loading this URL. Try again or fill in the form manually.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function optionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toResult(
  url: string,
  extracted: ExtractedFields,
): JobImportFromUrlResult {
  const title = extracted.title?.trim() ?? "";
  const company = extracted.company?.trim() ?? "";
  if (!title || !company) {
    throw new Error(
      "Could not find a job title and company on this page. Try filling in the form manually.",
    );
  }

  const description = optionalString(extracted.description ?? undefined);
  return {
    title,
    company,
    url,
    jobNumber: optionalString(extracted.jobNumber ?? undefined),
    description: description?.slice(0, 4000),
    notes: `Imported from ${new URL(url).hostname}`,
  };
}

export type PageFetcher = (url: URL) => Promise<string>;

export class JobImportAgent {
  constructor(
    private readonly client: ClaudeClient,
    private readonly fetchPage: PageFetcher = fetchJobPageHtml,
  ) {}

  async importFromUrl(urlString: string): Promise<JobImportFromUrlResult> {
    const url = parseJobUrl(urlString);
    const html = await this.fetchPage(url);
    const text = htmlToText(html).slice(0, MAX_TEXT_CHARS);
    if (text.length < 50) {
      throw new Error(
        "Could not read enough content from this page. Try filling in the form manually.",
      );
    }

    const raw = await this.client.complete("generation", {
      system: EXTRACT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `URL: ${url.href}\n\nPage content:\n${text}`,
        },
      ],
    });

    return toResult(url.href, parseStructuredOutput<ExtractedFields>(raw));
  }
}
