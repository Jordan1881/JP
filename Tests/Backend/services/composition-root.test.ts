import { describe, expect, it, beforeEach } from "vitest";
import {
  CURRENT_TERMS_VERSION,
} from "@jp/shared-types";
import {
  getDevStores,
  resetDevStores,
} from "@backend/services/composition-root.js";
import { getDevUserAccountRepository } from "@backend/modules/user-account/index.js";
import { getDevNotificationCenter } from "@backend/modules/notification-center/index.js";

describe("composition-root dev stores", () => {
  beforeEach(() => {
    resetDevStores();
  });

  it("wires account delete to cascade notifications via getDevUserAccountRepository", async () => {
    const stores = getDevStores();
    const repository = getDevUserAccountRepository();

    expect(repository).toBe(stores.userAccountRepository);

    await repository.create("user-1", {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });
    await stores.jobRepository.create("user-1", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-01",
    });
    await getDevNotificationCenter().create({
      userId: "user-1",
      type: "stale_job",
      jobId: "job-1",
      title: "Stale",
      message: "Update stage",
    });

    await repository.delete("user-1");

    expect(await repository.get("user-1")).toBeNull();
    expect(await getDevNotificationCenter().list("user-1")).toEqual([]);
  });
});
