// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  
  // Ejecutar pruebas en paralelo
  fullyParallel: true,
  
  // Fallar el build si hay tests con .only en CI
  forbidOnly: !!process.env.CI,
  
  // Reintentos en CI
  retries: process.env.CI ? 2 : 0,
  
  // Workers paralelos
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    // URL base del frontend
    baseURL: 'http://localhost:5173',

    // Guardar screenshots en fallos
    screenshot: 'only-on-failure',

    // Guardar video en fallos
    video: 'retain-on-failure',

    // Trace en reintentos
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Descomentar para pruebas multi-browser
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Arrancar el servidor de desarrollo antes de las pruebas
  webServer: {
    command:             process.env.CI ? 'npm run preview' : 'npm run dev',
    url:                 process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout:             120000,
  },
});
