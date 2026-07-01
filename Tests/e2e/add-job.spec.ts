import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("add job flow", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run");

  test("login, add job, and see it in applications table", async ({ page }) => {
    const jobTitle = `E2E Test Role ${Date.now()}`;
    const company = "Acme Corp";
    const apiLogs: string[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/api/jobs")) {
        const body = await response.text().catch(() => "");
        apiLogs.push(`${response.request().method()} ${response.status()} ${body.slice(0, 200)}`);
      }
    });

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

    await page.locator("#add-job").scrollIntoViewIfNeeded();
    await page.getByLabel("Job title *").fill(jobTitle);
    await page.getByLabel("Company *").fill(company);

    const postResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/jobs") &&
        response.request().method() === "POST",
    );
    await page.locator("#add-job form button[type='submit']").click({ force: true });
    const created = await postResponse;
    expect(created.ok(), `POST failed: ${apiLogs.join(" | ")}`).toBeTruthy();

    await expect(page.getByRole("cell", { name: jobTitle })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("cell", { name: company })).toBeVisible();
  });
});
