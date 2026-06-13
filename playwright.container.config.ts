// GENERATED_BY=generic-testing-architecture-capability-installer
import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: baseConfig.testDir || './tests',
  testIgnore: ['**/*.live.spec.ts', '**/live-*.spec.ts', '**/tier4-*.spec.ts', '**/tier4_*.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/container', open: 'never' }]],
  projects: [{ name: 'container-chromium', use: { ...devices['Desktop Chrome'] } }],
  use: {
    ...(baseConfig.use || {}),
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: { args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] },
  },
  webServer: {
    command: 'npm run dev:test -- --host 127.0.0.1 --port 3000 --strictPort',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      HEADLESS: 'true',
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
      TEST_RUNTIME: process.env.TEST_RUNTIME || 'container',
    },
  },
});
