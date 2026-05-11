// tests/helpers/urls.helper.js
// Helper central para construcción de URLs en pruebas
//
// Usa variable de entorno PLAYWRIGHT_BASE_URL si está disponible
// → En CI: PLAYWRIGHT_BASE_URL=http://localhost:4173 (preview build)
// → En local: http://localhost:5173 (dev server)

export const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

/**
 * Construye la URL completa para una ruta del frontend
 * Uso: await page.goto(url('/login'));
 */
export const url = (path) => `${BASE_URL}${path}`;
