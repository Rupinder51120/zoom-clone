import { test, expect } from "@playwright/test";
test("mandatory dashboard schedule persist and join validations", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: "New Meeting", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Join", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Schedule", exact: true }).first(),
  ).toBeVisible();
  for (const name of ["Upcoming Meetings", "Recent Meetings"])
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.goto("/join");
  await expect(
    page.getByRole("button", { name: "Join", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Meeting ID or Invite Link", { exact: true })
    .fill("99999999999");
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.locator("#join-error")).toContainText("Meeting not found");
  await page
    .getByLabel("Meeting ID or Invite Link", { exact: true })
    .fill("http://localhost:3004/room/invalid");
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.locator("#join-error")).toContainText("11-digit");
  await page.goto("/meeting/schedule");
  await page.locator("#topic").fill("Readiness scheduled meeting");
  await page.getByRole("button", { name: "Add Description" }).click();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Persisted readiness agenda");
  await page.getByLabel("When", { exact: true }).fill("2030-01-15");
  const pending = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/backend/api/meetings") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const r = await pending;
  expect(r.status()).toBe(201);
  const m = await r.json();
  expect(m.scheduled_start).toBe("2030-01-15T05:00:00+00:00");
  await expect(page).toHaveURL(new RegExp(`/meetings/${m.code}`));
  await page.reload();
  await expect(
    page.getByText("Persisted readiness agenda", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Copy Invitation", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    `/join?meeting=${m.code}`,
  );
  await page.goto("/meetings");
  await expect(page.locator(`a[href="/meetings/${m.code}"]`)).toBeVisible();
  await page.goto("/join");
  await page
    .getByLabel("Meeting ID or Invite Link", { exact: true })
    .fill(`http://localhost:3004/join?meeting=${m.code}`);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/room/${m.code}`));
  await expect(
    page.getByRole("button", { name: "Join Meeting", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Your Name", { exact: true }).fill("Fresh guest");
  await expect(
    page.getByRole("button", { name: "Join Meeting", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Your Name", { exact: true })).toBeVisible();
});
test("real media host refresh mute remove end", async ({ browser }) => {
  const hc = await browser.newContext({
      permissions: ["camera", "microphone"],
    }),
    gc = await browser.newContext({ permissions: ["camera", "microphone"] });
  await hc.addInitScript(() => {
    const PC = window.RTCPeerConnection;
    const connections: RTCPeerConnection[] = [];
    Object.assign(window, { __pcs: connections });
    window.RTCPeerConnection = class extends PC {
      constructor(config?: RTCConfiguration) {
        super(config);
        connections.push(this);
      }
    };
    const Native = window.WebSocket;
    const sockets: WebSocket[] = [];
    Object.assign(window, { __sockets: sockets });
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        sockets.push(this);
      }
    };
  });
  const host = await hc.newPage(),
    guest = await gc.newPage();
  await host.goto("http://localhost:3004/");
  await host.getByRole("button", { name: "New Meeting", exact: true }).click();
  await expect(host).toHaveURL(/\/room\/\d+/);
  const code = host.url().match(/\/room\/(\d+)/)![1];
  await host
    .getByRole("button", { name: "Start Meeting", exact: true })
    .click();
  await expect(host.getByText("Connected", { exact: true })).toBeVisible();
  await guest.goto(`http://localhost:3004/join?meeting=${code}`);
  await guest.getByLabel("Your Name", { exact: true }).fill("Readiness Guest");
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await guest
    .getByRole("button", { name: "Join Meeting", exact: true })
    .click();
  await expect(guest.getByText("Connected", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      host
        .locator(".video-tile:not(.local) video")
        .evaluate(
          (v: HTMLVideoElement) => v.readyState >= 2 && v.videoWidth > 0,
        ),
    )
    .toBe(true);
  const tracks = await host
    .locator(".video-tile:not(.local) video")
    .evaluate((v: HTMLVideoElement) =>
      (v.srcObject as MediaStream).getTracks().map((t) => t.kind),
    );
  expect(tracks).toEqual(expect.arrayContaining(["audio", "video"]));
  await expect
    .poll(() =>
      host.evaluate(async () => {
        for (const pc of (window as unknown as { __pcs: RTCPeerConnection[] })
          .__pcs) {
          for (const stat of (await pc.getStats()).values()) {
            if (
              stat.type === "inbound-rtp" &&
              stat.kind === "audio" &&
              stat.packetsReceived > 0
            )
              return true;
          }
        }
        return false;
      }),
    )
    .toBe(true);
  await host.getByRole("button", { name: "Stop video", exact: true }).click();
  await expect(guest.locator(".video-tile:not(.local) video")).toHaveClass(
    "hidden-video",
  );
  await host.getByRole("button", { name: "Start video", exact: true }).click();
  await expect(guest.locator(".video-tile:not(.local) video")).not.toHaveClass(
    "hidden-video",
  );

  await host.reload();
  await host
    .getByRole("button", { name: "Start Meeting", exact: true })
    .click();
  await expect(host.getByText("Connected", { exact: true })).toBeVisible();
  await host
    .getByRole("button", { name: "Participants (2)", exact: true })
    .click();
  await host.getByRole("button", { name: "Mute All", exact: true }).click();
  await expect(
    guest.getByRole("button", { name: "Unmute microphone", exact: true }),
  ).toBeVisible();
  await host.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(
    guest.getByText("You were removed from this meeting by the host.", {
      exact: true,
    }),
  ).toBeVisible();
  await host.evaluate(() => {
    (window as unknown as { __sockets: WebSocket[] }).__sockets.forEach((s) =>
      s.close(),
    );
  });
  await expect(
    host.getByRole("link", { name: "Rejoin meeting" }),
  ).toHaveAttribute("href", `/room/${code}?host=1`);
  await host.getByRole("link", { name: "Rejoin meeting" }).click();
  await host
    .getByRole("button", { name: "Start Meeting", exact: true })
    .click();
  await expect(host.getByText("Connected", { exact: true })).toBeVisible();
  await host.getByRole("button", { name: "End", exact: true }).click();
  await host
    .getByRole("button", { name: "End Meeting for All", exact: true })
    .click();
  await expect(
    host.getByText("The host ended this meeting.", { exact: true }),
  ).toBeVisible();
  await expect(host.getByRole("link", { name: "Rejoin meeting" })).toHaveCount(
    0,
  );
  await guest.goto(`http://localhost:3004/join?meeting=${code}`);
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await expect(guest.locator("#join-error")).toContainText("ended");
  await hc.close();
  await gc.close();
});
for (const colorScheme of ["light", "dark"] as const)
  for (const width of [390, 768, 1440])
    test(`responsive ${colorScheme} ${width}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 900 });
      for (const url of ["/", "/dashboard", "/join", "/meeting/schedule"]) {
        await page.goto(url);
        await expect(page.locator("body")).toContainText("ZOOM-CLONE");
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
      }
    });
test("optional signup signin signout and fresh-account empty dashboard", async ({
  page,
}) => {
  const email = `readiness-${Date.now()}@example.test`,
    password = "readiness testing passphrase";
  await page.goto("/signup");
  await page.getByLabel("First name", { exact: true }).fill("Readiness");
  await page.getByLabel("Last name", { exact: true }).fill("User");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3004/");
  await expect(page.locator(".empty-state")).toHaveCount(2);
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page.locator(".meeting-row").first()).toBeVisible();
  await page.goto("/signin");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3004/");
  await expect(page.locator(".empty-state")).toHaveCount(2);
});
