// tests/global-setup.js
// Hace login UNA sola vez antes de todos los tests
// Guarda las cookies para que los tests las reutilicen

import { chromium, expect } from '@playwright/test';

// Usa variable de entorno para ser compatible con CI y local
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

const CREDENCIALES = {
  email:    'admin@dte.local',
  password: 'Admin@DTE2024!',
};

export default async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.waitForFunction(() => (
    document.querySelector('#tenant_id') ||
    document.querySelector('button[type="submit"]:not([disabled])')
  ));
  const tenantSelect = page.locator('#tenant_id');
  if (await tenantSelect.count()) {
    await tenantSelect.selectOption({ index: 1 });
  }
  await page.fill('#email',    CREDENCIALES.email);
  await page.fill('#password', CREDENCIALES.password);
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);

  // Guardar estado de la sesión
  await context.storageState({ path: 'tests/.auth/session.json' });

  await browser.close();
}
