import { expect, test } from "@playwright/test";

test("host admits a guest; chat, hand, reactions and screen tracks reach the guest", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const brush = canvas.getContext("2d")!;
        const timer = setInterval(() => {
          brush.fillStyle = "blue";
          brush.fillRect(0, 0, 640, 360);
        }, 50);
        const stream = canvas.captureStream(20);
        stream
          .getVideoTracks()[0]
          .addEventListener("ended", () => clearInterval(timer));
        Object.assign(window, { sharedTrack: stream.getVideoTracks()[0] });
        return stream;
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "New Meeting", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Meeting", exact: true })
    .click();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  const code = new URL(page.url()).pathname.split("/").pop();
  await page.getByRole("button", { name: "Host tools", exact: true }).click();
  await page.getByRole("switch", { name: /Waiting room/ }).click();
  await expect(
    page.getByRole("switch", { name: /Waiting room/ }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Close host tools" }).click();
  const guest = await context.newPage();
  await guest.goto(`/room/${code}?video=0&audio=0`);
  await guest.getByLabel("Your Name", { exact: true }).fill("Waiting guest");
  await guest
    .getByRole("button", { name: "Join Meeting", exact: true })
    .click();
  await expect(
    guest.getByText("Waiting for host admission", { exact: true }),
  ).toBeVisible();
  await expect(
    guest.getByRole("button", { name: "Raise Hand", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Participants (1)", exact: true })
    .click();
  await page.getByRole("button", { name: "Admit", exact: true }).click();
  await expect(guest.getByText("Connected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close participants" }).click();
  for (const peer of [page, guest])
    await peer.getByRole("button", { name: "Chat", exact: true }).click();
  await page.getByLabel("Message everyone").fill("Hello from the host");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    guest.getByText("Hello from the host", { exact: true }),
  ).toBeVisible();
  await guest.getByLabel("Message everyone").fill("Hello from the guest");
  await guest.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByText("Hello from the guest", { exact: true }),
  ).toBeVisible();
  await guest.getByRole("button", { name: "Raise Hand", exact: true }).click();
  await expect(page.locator(".tile-hand")).toBeVisible();
  await guest.getByRole("button", { name: "Lower Hand", exact: true }).click();
  await expect(page.locator(".tile-hand")).toHaveCount(0);
  await guest.getByRole("button", { name: "Reactions", exact: true }).click();
  await guest.getByRole("button", { name: "React 👍", exact: true }).click();
  await expect(page.locator(".tile-reaction")).toHaveText("👍");
  await page.getByRole("button", { name: "Share Screen", exact: true }).click();
  await expect(guest.locator(".video-tile.sharing:not(.local)")).toBeVisible();
  await expect
    .poll(() =>
      guest
        .locator(".video-tile.sharing video")
        .evaluate((element: HTMLVideoElement) => element.videoWidth),
    )
    .toBe(640);
  await page.getByRole("button", { name: "Stop Sharing", exact: true }).click();
  await expect(guest.locator(".video-tile.sharing")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { sharedTrack: MediaStreamTrack }).sharedTrack
          .readyState,
    ),
  ).toBe("ended");
  await page.getByRole("button", { name: "End", exact: true }).click();
  await page
    .getByRole("button", { name: "End Meeting for All", exact: true })
    .click();
  await expect(guest.getByText("The host ended this meeting.")).toBeVisible();
});
