import { defineConfig, devices } from "@playwright/test";

// Default 3001 so E2E does not collide with `npm run dev` on 3000.
const PORT = process.env.PORT ?? "3001";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI
      ? `npm run start -- --port ${PORT}`
      : `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_ALLOWED_DEV_ORIGINS: "127.0.0.1",
    },
    timeout: 120_000,
  },
});
