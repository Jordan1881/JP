import type { JobImportInput, JobImportResult } from "@jp/shared-types";
import type { JobImportAgentPort } from "./ports.js";

export async function importJob(
  input: JobImportInput,
  agent: JobImportAgentPort,
): Promise<JobImportResult> {
  if (input.text?.trim()) {
    return agent.importFromText(input.text);
  }
  if (input.url?.trim()) {
    return agent.importFromUrl(input.url);
  }
  throw new Error("A job URL or pasted text is required");
}
