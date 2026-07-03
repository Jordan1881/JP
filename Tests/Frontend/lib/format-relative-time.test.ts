import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "../../../Frontend/lib/format-relative-time";

describe("formatRelativeTime", () => {
  it("formats past dates relative to now", () => {
    const now = new Date("2026-07-04T12:00:00Z");
    const threeDaysAgo = "2026-07-01T12:00:00Z";
    expect(formatRelativeTime(threeDaysAgo, now)).toMatch(/3 days ago|3 day ago/i);
  });
});
