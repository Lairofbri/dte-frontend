// tests/helpers/auth.helper.js
// Funciones reutilizables para autenticación en pruebas

import { url } from './urls.helper';

export const CREDENCIALES = {
  admin: {
    email:    'admin@dte.local',
    password: 'Admin@DTE2024!',
  },
  invalidas: {
    email:    'admin@dte.local',
    password: 'passwordIncorrecto123!',
  },
};

/**
 * Hacer login como administrador
 */
export const loginComoAdmin = async (page) => {
  await page.goto(url('/login'));
  await page.fill('#email',    CREDENCIALES.admin.email);
  await page.fill('#password', CREDENCIALES.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${url('/dashboard')}`);
};
