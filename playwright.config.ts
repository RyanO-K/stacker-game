import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./playwright.global-setup'),
  timeout: 15_000,
  expect: { timeout: 3_000 },
  reporter: [['html', { open: 'never' }], ['line']],
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
