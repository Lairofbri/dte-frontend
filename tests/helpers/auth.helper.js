// tests/helpers/auth.helper.js
// Funciones reutilizables para autenticación en pruebas

/**
 * Credenciales de prueba
 * Usar solo en ambiente de desarrollo/pruebas
 */
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
 * Hacer login programáticamente
 * Más rápido que llenar el formulario en cada prueba
 */
export const loginComoAdmin = async (page) => {
  await page.goto('http://localhost:5173/login');
  await page.fill('#email',    CREDENCIALES.admin.email);
  await page.fill('#password', CREDENCIALES.admin.password);
  await page.click('button[type="submit"]');
  // Esperar a que redirija al dashboard
  await page.waitForURL('**/dashboard');
};
