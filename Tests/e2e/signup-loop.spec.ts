import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("signup redirect loop", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run");

  test("finish setup stays on home after reload", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(signup)?$/, { timeout: 20_000 });

    if (!page.url().includes("signup")) {
      await page.goto("/signup");
    }

    const finishHeading = page.getByRole("heading", { name: "Finish your account" });
    if (await finishHeading.isVisible()) {
      const terms = page.getByRole("checkbox");
      if (!(await terms.isChecked())) {
        await terms.check();
      }
      await page.getByRole("button", { name: /finish setup/i }).click();
      await expect(page).toHaveURL("/", { timeout: 20_000 });
    }

    await page.reload();
    await expect(page).toHaveURL("/", { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Finish your account" }),
    ).not.toBeVisible();
  });
});
