import { describe, expect, it } from "vitest";
import { getGreeting } from "@frontend/lib/app";

describe("Frontend smoke", () => {
  it("exposes app greeting helper", () => {
    expect(getGreeting()).toContain("JP — Job Player");
  });
});
