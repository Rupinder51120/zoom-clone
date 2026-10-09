import { defineConfig } from "@playwright/test";

/** Dedicated ports and a disposable SQLite DB keep acceptance tests isolated. */
export default defineConfig({
  testDir: "./tests/regression",
  timeout: 60000,
  workers: 1,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: "http://localhost:3004",
    channel: process.env.TEST_BROWSER_CHANNEL,
    permissions: ["camera", "microphone", "clipboard-read", "clipboard-write"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "python ../backend/ci/e2e_server.py",
      url: "http://localhost:8004/health",
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: "npm run start -- --port 3004",
      url: "http://localhost:3004",
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        BACKEND_URL: "http://127.0.0.1:8004",
        NEXT_PUBLIC_WS_URL: "ws://localhost:8004",
        HOST_API_KEY: "disposable-e2e-key",
        APP_ORIGIN: "http://localhost:3004",
      },
    },
  ],
});
