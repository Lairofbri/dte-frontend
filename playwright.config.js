// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

// Puerto según el ambiente
// CI usa 'npm run preview' → puerto 4173
// Desarrollo usa 'npm run dev' → puerto 5173
const PORT   = process.env.CI ? 4173 : 5173;
const BASE   = `http://localhost:${PORT}`;

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
    // URL base — relativa en tests, absoluta aquí
    // Permite usar page.goto('/login') en todos los ambientes
    baseURL: BASE,

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

  // Configuración del servidor de desarrollo
  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url:     BASE,
    // reuseExistingServer: true SIEMPRE
    // → En desarrollo: reutiliza el servidor que ya tienes corriendo
    // → En CI: el workflow ya arrancó el servidor con 'npm run preview'
    //          Playwright lo reutiliza en vez de intentar arrancar otro
    reuseExistingServer: true,
    timeout: 120000,
  },
});
