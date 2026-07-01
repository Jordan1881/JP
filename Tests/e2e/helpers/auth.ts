import { expect, type Page } from "@playwright/test";

export async function ensureLoggedIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(signup)?$/, { timeout: 25_000 });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!page.url().includes("/signup")) {
      break;
    }

    const finishHeading = page.getByRole("heading", { name: "Finish your account" });
    if (await finishHeading.isVisible()) {
      const terms = page.getByRole("checkbox");
      if (!(await terms.isChecked())) {
        await terms.check();
      }
      await page.getByRole("button", { name: /finish setup/i }).click();
      await page.waitForURL("/", { timeout: 25_000 });
    } else {
      break;
    }
  }

  await expect(page.locator("#add-job")).toBeVisible({ timeout: 20_000 });
}
