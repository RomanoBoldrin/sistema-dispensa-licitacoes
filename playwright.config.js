require("dotenv").config({ path: ".env.test" });
const { defineConfig, devices } = require("@playwright/test");

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || `http://localhost:${PORT}`;

module.exports = defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    launchOptions: {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: `NEXT_DIST_DIR=.next-test NODE_ENV=test dotenv -e .env.test -- npx next dev -p ${PORT}`,
    url: `${BASE_URL}/api/v1/status`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
