import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("add job flow", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run");

  test("login, add job, and see it in applications table", async ({ page }) => {
    const jobTitle = `E2E Test Role ${Date.now()}`;
    const company = "Acme Corp";

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/", { timeout: 20_000 });

    if (page.url().includes("/signup")) {
      const terms = page.getByRole("checkbox");
      if (await terms.isVisible()) {
        if (!(await terms.isChecked())) {
          await terms.check();
        }
        await page.getByRole("button", { name: /finish setup/i }).click();
        await page.waitForURL("/", { timeout: 20_000 });
      }
    }

    await page.getByRole("button", { name: /add application/i }).first().click();
    await page.getByLabel("Job title *").fill(jobTitle);
    await page.getByLabel("Company *").fill(company);
    await page.getByRole("button", { name: /^add job$/i }).click();

    await expect(page.getByRole("cell", { name: jobTitle })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("cell", { name: company })).toBeVisible();
  });
});
