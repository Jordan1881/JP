import { expect, test } from "@playwright/test";
import { ensureLoggedIn } from "./helpers/auth";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;

test.describe("add job flow", () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD");

  test("login, add job, and see it in applications table", async ({ page }) => {
    const jobTitle = `E2E Test Role ${Date.now()}`;
    const company = "Acme Corp";

    await ensureLoggedIn(page, email, password);

    await page.locator("#add-job").scrollIntoViewIfNeeded();
    await page.getByLabel("Job title *").fill(jobTitle);
    await page.getByLabel("Company *").fill(company);

    const postResponse = page.waitForResponse(
      (r) => r.url().includes("/api/jobs") && r.request().method() === "POST",
    );
    await page.locator("#add-job form button[type='submit']").click({ force: true });
    expect((await postResponse).ok()).toBeTruthy();

    await expect(page.getByRole("link", { name: jobTitle })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("cell", { name: company })).toBeVisible();
  });
});
