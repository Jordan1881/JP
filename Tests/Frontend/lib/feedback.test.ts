import { describe, expect, it } from "vitest";
import { getErrorMessage, isNetworkError } from "../../../Frontend/lib/feedback";

describe("feedback", () => {
  it("detects fetch failures as network errors", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });
  it("returns network copy for network errors", () => {
    expect(getErrorMessage(new TypeError("Failed to fetch"), "Fallback")).toBe("Couldn't reach server — try again");
  });
  it("returns error message for ordinary errors", () => {
    expect(getErrorMessage(new Error("Bad request"), "Fallback")).toBe("Bad request");
  });
  it("returns fallback for unknown values", () => {
    expect(getErrorMessage(null, "Something went wrong")).toBe("Something went wrong");
  });
});
