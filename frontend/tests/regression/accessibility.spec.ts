import { test, expect } from "@playwright/test";
for (const scheme of ["light", "dark"] as const) {
  test(`homepage evaluator: no login gate, native font, keyboard and motion ${scheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".dashboard-actions")).toBeVisible();
    await expect(
      page.getByText("Upcoming Meetings", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Recent Meetings", { exact: true }),
    ).toBeVisible();
    expect(
      await page
        .locator("body")
        .evaluate((e) => getComputedStyle(e).fontFamily),
    ).toContain("-apple-system");
    await page.getByRole("link", { name: "Join", exact: true }).first().click();
    const dialog = page.getByRole("dialog", {
      name: "Join Meeting",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    expect(
      await dialog.evaluate((e) => getComputedStyle(e).animationName),
    ).toBe("none");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("dialog")),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL("http://localhost:3004/");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.getByRole("link", { name: "Join", exact: true }).first().click();
    await expect(
      page.getByRole("dialog", { name: "Join Meeting", exact: true }),
    ).toBeVisible();
    expect(
      await page
        .locator(".workflow-dialog")
        .evaluate((e) => getComputedStyle(e).animationDuration),
    ).toBe("0.12s");
  });
}
