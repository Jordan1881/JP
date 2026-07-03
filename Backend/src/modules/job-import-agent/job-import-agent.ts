import type { JobImportResult } from "@jp/shared-types";
import type { ClaudeClient } from "../claude-api-client/index.js";
import { parseStructuredOutput } from "../claude-api-client/index.js";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 512_000;
const MAX_TEXT_CHARS = 24_000;
const MIN_CONTENT_CHARS = 50;

const BOT_BLOCK_MESSAGE =
  "This site blocks automated access. Open the posting in your browser, copy the job description, and paste it using \"Paste text instead\".";

const EXTRACT_SYSTEM = `You extract job application fields from a job posting.
Return JSON only:
{
  "title": string,
  "company": string,
  "jobNumber": string | null,
  "description": string | null
}

Rules:
- title and company are required — infer from the content, page <title>, or URL hostname when needed
- description: plain-text summary of role, requirements, and responsibilities (max ~2000 chars)
- jobNumber: requisition / job ID if explicitly shown, otherwise null
- Content may be in any language (e.g. Hebrew) — keep the original language
- Do not invent salary, benefits, or details not present in the content
- If the content is a login wall, captcha, or unrelated, set title and company to empty strings`;

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

/** Detect common bot-protection / JS-challenge shells that carry no job content. */
export function looksLikeBotChallenge(html: string, text: string): boolean {
  if (text.length >= 200) {
    return false;
  }
  const markers = [
    "winsocks",
    "rbzns",
    "captcha",
    "cf-browser-verification",
    "just a moment",
    "access denied",
    "enable javascript",
    "bot detection",
  ];
  const haystack = html.toLowerCase();
  return markers.some((marker) => haystack.includes(marker));
}

export async function fetchJobPageHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url.href, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en,he;q=0.8,*;q=0.5",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    // Some bot managers answer with 2xx-adjacent custom codes; only treat
    // real success (2xx) as a page, everything else as a block/error.
    if (response.status < 200 || response.status >= 300) {
      if (response.status === 403 || response.status === 401) {
        throw new Error(BOT_BLOCK_MESSAGE);
      }
      throw new Error(
        `Could not fetch this URL (HTTP ${response.status}). ${BOT_BLOCK_MESSAGE}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error(
        "This URL does not look like a web page. Try pasting the job text instead.",
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) {
      throw new Error(
        "This page is too large to import. Try pasting the job text instead.",
      );
    }

    return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Timed out loading this URL. Try again or paste the job text instead.",
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
  extracted: ExtractedFields,
  url?: string,
): JobImportResult {
  const title = extracted.title?.trim() ?? "";
  const company = extracted.company?.trim() ?? "";
  if (!title || !company) {
    throw new Error(
      "Could not find a job title and company. Try pasting the full job description text instead.",
    );
  }

  const description = optionalString(extracted.description ?? undefined);
  const source = url ? new URL(url).hostname : "pasted text";
  return {
    title,
    company,
    url: optionalString(url),
    jobNumber: optionalString(extracted.jobNumber ?? undefined),
    description: description?.slice(0, 4000),
    notes: `Imported from ${source}`,
  };
}

export type PageFetcher = (url: URL) => Promise<string>;

export class JobImportAgent {
  constructor(
    private readonly client: ClaudeClient,
    private readonly fetchPage: PageFetcher = fetchJobPageHtml,
  ) {}

  private async extract(
    content: string,
    context: string,
  ): Promise<ExtractedFields> {
    const raw = await this.client.complete("generation", {
      system: EXTRACT_SYSTEM,
      messages: [{ role: "user", content: `${context}\n\n${content}` }],
    });
    return parseStructuredOutput<ExtractedFields>(raw);
  }

  /** Extract fields from job description text the user pasted. */
  async importFromText(text: string): Promise<JobImportResult> {
    const clean = text.trim().slice(0, MAX_TEXT_CHARS);
    if (clean.length < MIN_CONTENT_CHARS) {
      throw new Error(
        "Paste more of the job description (title, company, and details).",
      );
    }
    const extracted = await this.extract(clean, "Pasted job description:");
    return toResult(extracted);
  }

  /** Fetch a posting URL and extract fields (MVP — no headless browser). */
  async importFromUrl(urlString: string): Promise<JobImportResult> {
    const url = parseJobUrl(urlString);
    const html = await this.fetchPage(url);
    const text = htmlToText(html).slice(0, MAX_TEXT_CHARS);

    if (looksLikeBotChallenge(html, text)) {
      throw new Error(BOT_BLOCK_MESSAGE);
    }
    if (text.length < MIN_CONTENT_CHARS) {
      throw new Error(
        `Could not read enough content from this page. ${BOT_BLOCK_MESSAGE}`,
      );
    }

    const extracted = await this.extract(text, `URL: ${url.href}\n\nPage content:`);
    return toResult(extracted, url.href);
  }
}
