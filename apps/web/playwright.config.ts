import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for web end-to-end tests.
 *
 * Boots BOTH the API and the web app before the suite so the E2E exercises the
 * real end-to-end path (web -> API -> health). The web server waits on the API's
 * `/health/live`, so if the API is unavailable the suite fails to start — which
 * is the intended fail-closed behavior.
 *
 * Browser binaries are normally installed with `pnpm exec playwright install`.
 * In restricted environments where that CDN is blocked, point
 * `PLAYWRIGHT_CHROMIUM_PATH` at a system Chromium instead.
 */
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @developeros/api start',
      url: 'http://localhost:4000/health/live',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: '4000',
        DATABASE_URL:
          process.env.DATABASE_URL ??
          'postgresql://developeros:developeros@localhost:5432/developeros_test',
        JWT_ACCESS_SECRET:
          process.env.JWT_ACCESS_SECRET ?? 'e2e-access-secret-e2e-access-secret-0001',
        JWT_REFRESH_SECRET:
          process.env.JWT_REFRESH_SECRET ?? 'e2e-refresh-secret-e2e-refresh-secret-001',
        CORS_ORIGINS: 'http://localhost:3000',
      },
    },
    {
      command: 'pnpm --filter @developeros/web start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:4000',
      },
    },
  ],
});
