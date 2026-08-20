import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm build && pnpm preview',
    reuseExistingServer: false,
    url: 'http://127.0.0.1:3000',
  },
})
