import { expect, test } from "@playwright/test";

for (const outcome of ["allowed", "denied"] as const) {
  test(`pending permission can be skipped safely when later ${outcome}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        value: () =>
          new Promise<MediaStream>((resolve, reject) => {
            Object.assign(window, {
              finishPermission(allowed: boolean) {
                if (!allowed) {
                  reject(
                    new DOMException("Permission denied", "NotAllowedError"),
                  );
                  return;
                }
                const canvas = document.createElement("canvas");
                const stream = canvas.captureStream();
                Object.assign(window, {
                  lateTrack: stream.getVideoTracks()[0],
                });
                resolve(stream);
              },
            });
          }),
      });
    });
    await page.goto("/");
    await page
      .getByRole("button", { name: "New Meeting", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Preparing devices…", exact: true }),
    ).toBeDisabled();
    await page
      .getByLabel("Your Name", { exact: true })
      .fill("Permission test host");
    await page
      .getByRole("button", {
        name: "Continue without audio/video",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Start Meeting", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Start Meeting", exact: true })
      .click();
    await expect(page.getByText("Connected", { exact: true })).toBeVisible();
    await page.evaluate((allowed) => {
      (
        window as unknown as { finishPermission: (allowed: boolean) => void }
      ).finishPermission(allowed);
    }, outcome === "allowed");
    if (outcome === "allowed") {
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as unknown as { lateTrack: MediaStreamTrack }).lateTrack
                .readyState,
          ),
        )
        .toBe("ended");
    }
    await expect(
      page.getByRole("button", { name: "Unmute microphone", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Start video", exact: true }),
    ).toBeEnabled();
    await expect(page.locator(".local video")).toHaveClass("hidden-video");
    expect(
      await page
        .locator(".local video")
        .evaluate((video: HTMLVideoElement) => video.srcObject),
    ).toBeNull();
    await expect(
      page.getByText(/Permission denied|device is unavailable/),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "End", exact: true }).click();
    await page
      .getByRole("button", { name: "End Meeting for All", exact: true })
      .click();
    await expect(
      page.getByText("The host ended this meeting.", { exact: true }),
    ).toBeVisible();
  });
}

test("authentication pages advertise only supported media", async ({
  page,
}) => {
  for (const route of ["/signin", "/signup"]) {
    await page.goto(route);
    await expect(
      page.getByText("Join with browser audio and video", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/screen sharing/i)).toHaveCount(0);
  }
});
