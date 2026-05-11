// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.CI ? 4173 : 5173;
const BASE = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Setup global — hace login UNA vez antes de todos los tests
  globalSetup: './tests/global-setup.js',

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL:    BASE,
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
    trace:      'on-first-retry',
    // Todos los tests usan la sesión guardada por globalSetup
    storageState: 'tests/.auth/session.json',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command:             process.env.CI ? 'npm run preview' : 'npm run dev',
    url:                 BASE,
    reuseExistingServer: true,
    timeout:             120000,
  },
});