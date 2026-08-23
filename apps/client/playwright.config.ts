import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  expect: {toHaveScreenshot: {animations: 'disabled'}},
  // UTC pins RelativeTime output so the baselines do not rot with the machine's timezone.
  use: {baseURL: 'http://localhost:4173', timezoneId: 'UTC'},
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome'], viewport: {width: 1024, height: 768}}},
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
