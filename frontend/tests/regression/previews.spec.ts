import { test, expect } from "@playwright/test";
test("dashboard and extra controls stay previews", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Share Screen", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Share Screen preview" }),
  ).toContainText("not available");
  await page.getByRole("button", { name: "Got it" }).click();
  await page.getByRole("button", { name: "New Meeting", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Meeting", exact: true })
    .click();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  for (const name of ["Chat", "Raise Hand", "Reactions", "Share Screen"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: `${name} preview` }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Got it" }).click();
  }
  await page.getByRole("button", { name: "Host tools", exact: true }).click();
  await page.getByRole("button", { name: "Waiting room", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Waiting room preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("switch")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mute all participants" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close host tools" }).click();
  await page.getByRole("button", { name: "End", exact: true }).click();
  await page.getByRole("button", { name: "End Meeting for All" }).click();
  await expect(page.getByText("The host ended this meeting.")).toBeVisible();
});
