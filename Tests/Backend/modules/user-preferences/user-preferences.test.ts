import { describe, expect, it } from "vitest";
import {
  InMemoryUserPreferencesStore,
  UserPreferencesRepository,
} from "@backend/modules/user-preferences/index.js";

describe("UserPreferencesRepository", () => {
  it("creates defaults and updates stage list + toggles", async () => {
    const repository = new UserPreferencesRepository(
      new InMemoryUserPreferencesStore(),
    );
    const created = await repository.getOrCreate("u1");
    expect(created.stageList.length).toBeGreaterThan(0);

    const updated = await repository.update("u1", {
      stageList: ["Submitted resume", "Interview"],
      staleNotificationsEnabled: false,
    });
    expect(updated.stageList).toEqual(["Submitted resume", "Interview"]);
    expect(updated.staleNotificationsEnabled).toBe(false);
    expect(updated.stageList).not.toContain("Accepted");
  });

  it("preserves custom stage list order through update and reload", async () => {
    const repository = new UserPreferencesRepository(
      new InMemoryUserPreferencesStore(),
    );
    const ordered = ["Final interview", "Phone screen", "Offer"];

    const updated = await repository.update("u1", { stageList: ordered });
    expect(updated.stageList).toEqual(ordered);

    const reloaded = await repository.getOrCreate("u1");
    expect(reloaded.stageList).toEqual(ordered);
  });
});
