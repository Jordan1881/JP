import { expect, test } from "@playwright/test";
import { ensureLoggedIn } from "./helpers/auth";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;

test.describe("settings stage list reorder", () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD");

  test("drag handles appear and reordered list persists after save and reload", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await ensureLoggedIn(page, email, password);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    const handles = page.getByTestId("stage-drag-handle");
    const count = await handles.count();
    test.skip(count < 2, "Need at least two custom stages to test reorder");

    const secondLabel = await page
      .getByTestId("stage-list-item")
      .nth(1)
      .locator("input")
      .inputValue();

    await handles.first().dragTo(page.getByTestId("stage-list-item").nth(1));

    const patchResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/preferences") &&
        response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Save preferences" }).click();
    expect((await patchResponse).ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    const firstAfter = await page
      .getByTestId("stage-list-item")
      .first()
      .locator("input")
      .inputValue();
    const secondAfter = await page
      .getByTestId("stage-list-item")
      .nth(1)
      .locator("input")
      .inputValue();

    expect(firstAfter).toBe(secondLabel);
    expect(secondAfter).not.toBe(secondLabel);
  });
});
