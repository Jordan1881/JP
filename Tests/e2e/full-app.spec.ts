import { expect, test, type Page } from "@playwright/test";
import { ensureLoggedIn } from "./helpers/auth";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;

test.describe("full app top-to-bottom", () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD");

  test("all major features work end-to-end", async ({ page }) => {
    test.setTimeout(120_000);

    const jobTitle = `QA Role ${Date.now()}`;
    const company = "Playwright Inc";

    await ensureLoggedIn(page, email, password);
    await expect(page.getByRole("navigation").getByRole("img", { name: /JP/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /track every application/i })).toBeVisible();

    // Theme toggle (skip if GSAP animating nav — use force click)
    await page.getByRole("button", { name: /open account menu/i }).click({ force: true });
    const themeToggle = page.getByRole("menuitem", { name: /mode/i });
    await expect(themeToggle).toBeVisible();
    const themeLabel = await themeToggle.textContent();
    await themeToggle.click();
    await page.getByRole("button", { name: /open account menu/i }).click({ force: true });
    await expect(page.getByRole("menuitem", { name: /mode/i })).not.toHaveText(themeLabel ?? "");

    // Add job
    await page.locator("#add-job").scrollIntoViewIfNeeded();
    await page.getByLabel("Job title *").fill(jobTitle);
    await page.getByLabel("Company *").fill(company);
    const postResponse = page.waitForResponse(
      (r) => r.url().includes("/api/jobs") && r.request().method() === "POST",
    );
    await page.locator("#add-job form button[type='submit']").click({ force: true });
    expect((await postResponse).ok()).toBeTruthy();
    await expect(page.getByRole("link", { name: jobTitle })).toBeVisible({ timeout: 20_000 });

    // Search / filter
    await page.getByPlaceholder("Search company, title, job #").fill(jobTitle);
    await expect(page.getByRole("link", { name: jobTitle })).toBeVisible();
    await page.getByPlaceholder("Search company, title, job #").fill("zzz-no-match-zzz");
    await expect(page.getByText("No matching applications")).toBeVisible();
    await page.getByPlaceholder("Search company, title, job #").fill(jobTitle);

    // Job detail + stage
    await page.getByRole("link", { name: jobTitle }).click();
    await expect(page).toHaveURL(/\/jobs\//);
    await expect(page.getByRole("heading", { name: jobTitle })).toBeVisible();
    const phoneScreen = page.getByRole("button", { name: "Phone screen" });
    if (await phoneScreen.isVisible()) {
      await phoneScreen.click();
      await expect(phoneScreen).toHaveClass(/bg-foreground/);
    }

    // Dashboard
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Applied")).toBeVisible();

    // Archive page
    await page.goto("/archive");
    await expect(page.getByRole("heading", { name: "Archive" })).toBeVisible();

    // Profile
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: /career profile|profile interview/i }),
    ).toBeVisible();

    // Settings
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Appearance")).toBeVisible();
    await expect(page.getByRole("button", { name: "Light" })).toBeVisible();
    await expect(page.getByText("Interview stages")).toBeVisible();

    // Account
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();

    // Terms
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /terms of use/i })).toBeVisible();

    // Notifications
    await page.goto("/");
    await ensureLoggedIn(page, email, password);
    await page.getByRole("button", { name: /notifications/i }).click();
    await expect(page.getByText("Notifications")).toBeVisible();

    // Archive job from detail
    await page.goto("/");
    await page.getByRole("link", { name: jobTitle }).click();
    const archiveBtn = page.getByRole("button", { name: /archive job/i });
    if (await archiveBtn.isVisible()) {
      page.once("dialog", (dialog) => dialog.accept());
      await archiveBtn.click();
      await page.waitForURL(/\/archive/, { timeout: 15_000 });
      await expect(page.getByRole("link", { name: jobTitle })).toBeVisible({
        timeout: 15_000,
      });
    }
  });
});
