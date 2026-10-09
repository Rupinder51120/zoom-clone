import { test, expect } from "@playwright/test";
test("dashboard and extra controls stay previews", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "My Notes", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "My Notes preview" }),
  ).toContainText("not available");
  await page.getByRole("button", { name: "Got it" }).click();
  await page.getByRole("button", { name: "New Meeting", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Meeting", exact: true })
    .click();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Host tools", exact: true }).click();
  await page.getByRole("button", { name: "Recording", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Recording preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(
    page.getByRole("button", { name: "Mute all participants" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close host tools" }).click();
  await page.getByRole("button", { name: "End", exact: true }).click();
  await page.getByRole("button", { name: "End Meeting for All" }).click();
  await expect(page.getByText("The host ended this meeting.")).toBeVisible();
});
