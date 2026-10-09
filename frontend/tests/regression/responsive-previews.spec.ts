import { test, expect } from "@playwright/test";
for (const theme of ["light", "dark"] as const)
  for (const width of [390, 1440])
    test(`${theme} ${width} placeholders`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      await page.getByRole("button", { name: "My Notes", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "My Notes preview" }),
      ).toBeVisible();
      await expect(
        page.getByRole("dialog").getByText("Preview only"),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "ZoomMate", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "ZoomMate preview" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Got it" }).click();
      await page.getByText("More", { exact: true }).click();
      await page
        .getByRole("button", { name: "Whiteboards", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Whiteboards preview" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await page.goto("/meeting/schedule");
      await page.getByText("More Options", { exact: true }).click();
      await expect(
        page.getByLabel("Waiting Room", { exact: true }),
      ).toBeDisabled();
      await page
        .getByRole("button", { name: "Create agenda", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Create agenda preview" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
