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
  // The page built against the preview's own origin, which serves the registry snapshot under
  // `/registry` (task-11.5 decision 11): every catalog arrives through the loader.
  webServer: {
    command: 'pnpm preview:snapshot',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
