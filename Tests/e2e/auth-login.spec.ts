import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("auth login loop", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run");

  test("login without JP account shows finish setup, not user already exists", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/signup/, { timeout: 20_000 });
    await expect(page.getByText("User already exists")).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Finish your account" }),
    ).toBeVisible();
  });

  test("finish setup completes profile and reaches home", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/signup/, { timeout: 20_000 });

    const finishButton = page.getByRole("button", { name: /finish setup/i });
    await expect(finishButton).toBeVisible();
    const terms = page.getByRole("checkbox");
    if (!(await terms.isChecked())) {
      await terms.check();
    }
    const nameField = page.getByLabel("Name");
    if ((await nameField.inputValue()) === "") {
      await nameField.fill("Yarden");
    }
    await finishButton.click();
    await expect(page.getByText("User already exists")).not.toBeVisible();
    await expect(page).toHaveURL("/", { timeout: 20_000 });
  });
});
