// tests/helpers/urls.helper.js
// Helper central para construcción de URLs en pruebas
// Evita URLs hardcodeadas dispersas en los tests
//
// Al publicar el backend cambiar BASE_URL por variable de entorno:
// export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export const BASE_URL = 'http://localhost:5173';

/**
 * Construye la URL completa para una ruta del frontend
 * Uso: await page.goto(url('/login'));
 */
export const url = (path) => `${BASE_URL}${path}`;
