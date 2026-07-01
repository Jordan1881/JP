import { describe, expect, it } from "vitest";
import {
  CURRENT_TERMS_VERSION,
  needsTermsReacceptance,
} from "@jp/shared-types";
import { createJobRepository, InMemoryJobStore } from "@backend/modules/job-repository/index.js";
import {
  createUserAccountRepository,
  InMemoryUserAccountStore,
} from "@backend/modules/user-account/index.js";

describe("UserAccountRepository", () => {
  it("creates an account with terms acceptance recorded", async () => {
    const repository = createUserAccountRepository(new InMemoryUserAccountStore());

    const account = await repository.create("user-1", {
      name: "Jordan Biton",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });

    expect(account.userId).toBe("user-1");
    expect(account.name).toBe("Jordan Biton");
    expect(account.email).toBe("jordan@example.com");
    expect(account.termsVersion).toBe(CURRENT_TERMS_VERSION);
    expect(account.termsAcceptedAt).toBeTruthy();
  });

  it("rejects account creation without matching terms version", async () => {
    const repository = createUserAccountRepository(new InMemoryUserAccountStore());

    await expect(
      repository.create("user-1", {
        name: "Jordan",
        email: "jordan@example.com",
        termsVersion: "0.9.0",
      }),
    ).rejects.toThrow(/Terms version must be/);
  });

  it("updates name and photo URL", async () => {
    const repository = createUserAccountRepository(new InMemoryUserAccountStore());
    await repository.create("user-1", {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });

    const updated = await repository.update("user-1", {
      name: "Yarden Biton",
      photoUrl: "https://example.com/photo.jpg",
    });

    expect(updated.name).toBe("Yarden Biton");
    expect(updated.photoUrl).toBe("https://example.com/photo.jpg");
  });

  it("records re-acceptance when terms version bumps", async () => {
    const repository = createUserAccountRepository(new InMemoryUserAccountStore());
    const created = await repository.create("user-1", {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });

    const staleAccount = { ...created, termsVersion: "0.9.0" };
    expect(needsTermsReacceptance(staleAccount)).toBe(true);

    const accepted = await repository.acceptTerms("user-1", {
      termsVersion: CURRENT_TERMS_VERSION,
    });
    expect(needsTermsReacceptance(accepted)).toBe(false);
    expect(accepted.termsVersion).toBe(CURRENT_TERMS_VERSION);
  });

  it("deletes account and associated jobs", async () => {
    const jobStore = new InMemoryJobStore();
    const repository = createUserAccountRepository(
      new InMemoryUserAccountStore(),
      jobStore,
    );
    const jobs = createJobRepository(jobStore);

    await repository.create("user-1", {
      name: "Jordan",
      email: "jordan@example.com",
      termsVersion: CURRENT_TERMS_VERSION,
    });
    await jobs.create("user-1", {
      title: "Engineer",
      company: "Acme",
      submissionDate: "2026-01-01",
    });

    await repository.delete("user-1");

    expect(await repository.get("user-1")).toBeNull();
    expect(await jobStore.listByUser("user-1")).toEqual([]);
  });
});
