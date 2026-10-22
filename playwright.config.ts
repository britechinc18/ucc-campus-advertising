import { defineConfig } from '@playwright/test';
const baseURL = process.env.BROWSER_BASE_URL ?? 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname))
  throw new Error('Browser fixtures may only target a local disposable application');
export default defineConfig({
  testDir: './tests/browser',
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    trace: 'off',
    actionTimeout: 15000,
    navigationTimeout: 20000,
    screenshot: 'off',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: 'npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  outputDir: '/tmp/ucc-playwright-results',
});
