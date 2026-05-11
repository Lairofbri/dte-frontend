// tests/global-setup.js
// Hace login UNA sola vez antes de todos los tests
// Guarda las cookies para que los tests las reutilicen
// Simula el comportamiento real: el usuario abre el navegador y hace login una vez

import { chromium } from '@playwright/test';
import { BASE_URL }  from './helpers/urls.helper';

const CREDENCIALES = {
  email:    'admin@dte.local',
  password: 'Admin@DTE2024!',
};

export default async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page    = await context.newPage();

  // Hacer login una sola vez
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email',    CREDENCIALES.email);
  await page.fill('#password', CREDENCIALES.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);

  // Guardar estado de la sesión (cookies incluidas)
  await context.storageState({ path: 'tests/.auth/session.json' });

  await browser.close();
}
