// tests/helpers/auth.helper.js
// Funciones reutilizables para autenticación en pruebas

import { url, BASE_URL } from './urls.helper';

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
 * Usa url() para que funcione tanto en local como en CI
 */
export const loginComoAdmin = async (page) => {
  await page.goto(url('/login'));
  await page.fill('#email',    CREDENCIALES.admin.email);
  await page.fill('#password', CREDENCIALES.admin.password);
  await page.click('button[type="submit"]');
  // Esperar dashboard con matcher agnóstico al host/puerto
