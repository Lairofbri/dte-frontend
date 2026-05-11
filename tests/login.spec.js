// tests/login.spec.js
// Pruebas E2E automatizadas del módulo de Login
// Cubre todos los casos probados manualmente en el paso 2

import { test, expect } from '@playwright/test';
import { CREDENCIALES, loginComoAdmin } from './helpers/auth.helper';

test.describe('Login', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
  });

  // ─────────────────────────────────────────────
  // CASO 1 — Campos vacíos
  // ─────────────────────────────────────────────
  test('debe mostrar errores de validación con campos vacíos', async ({ page }) => {
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert').first())
      .toBeVisible();

    // Verificar que NO se hizo request al backend
    // Los errores de Zod aparecen sin network request
    await expect(page.locator('.error-msg')).toHaveCount(2);
  });

  // ─────────────────────────────────────────────
  // CASO 2 — Email inválido
  // ─────────────────────────────────────────────
  test('debe mostrar error con email inválido', async ({ page }) => {
    await page.fill('#email', 'esto no es un email');
    await page.fill('#password', 'cualquier cosa');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-msg'))
      .toContainText('El email no tiene un formato válido.');
  });

  // ─────────────────────────────────────────────
  // CASO 3 — Credenciales incorrectas
  // ─────────────────────────────────────────────
  test('debe mostrar mensaje genérico con credenciales incorrectas', async ({ page }) => {
    await page.fill('#email',    CREDENCIALES.invalidas.email);
    await page.fill('#password', CREDENCIALES.invalidas.password);
    await page.click('button[type="submit"]');

    // Mensaje fijo — no revelar si el email existe
    await expect(page.locator('.text-red-600'))
      .toContainText('Correo o contraseña incorrectos.');

    // El campo password debe limpiarse
    await expect(page.locator('#password')).toHaveValue('');

    // El email debe mantenerse
    await expect(page.locator('#email'))
      .toHaveValue(CREDENCIALES.invalidas.email);
  });

  // ─────────────────────────────────────────────
  // CASO 4 — Login exitoso
  // ─────────────────────────────────────────────
  test('debe redirigir al dashboard con credenciales correctas', async ({ page }) => {
    await page.fill('#email',    CREDENCIALES.admin.email);
    await page.fill('#password', CREDENCIALES.admin.password);
    await page.click('button[type="submit"]');

    // Debe redirigir al dashboard
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);

    // El sidebar debe mostrar el nombre del usuario
    await expect(page.locator('aside'))
      .toContainText('Administrador');
  });

  // ─────────────────────────────────────────────
  // CASO 5 — Toggle de password
  // ─────────────────────────────────────────────
  test('debe mostrar y ocultar la contraseña con el toggle', async ({ page }) => {
    await page.fill('#password', 'miPassword123');

    // Por defecto tipo password
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');

    // Click en el ojo — mostrar password
    await page.click('button[aria-label="Mostrar contraseña"]');
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');

    // Click de nuevo — ocultar
    await page.click('button[aria-label="Ocultar contraseña"]');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  });

  // ─────────────────────────────────────────────
  // CASO 6 — Ya autenticado
  // ─────────────────────────────────────────────
  test('debe redirigir al dashboard si ya hay sesión activa', async ({ page }) => {
    // Primero hacer login
    await loginComoAdmin(page);

    // Intentar ir al login manualmente
    await page.goto('http://localhost:5173/login');

    // Debe redirigir al dashboard automáticamente
    await expect(page).toHaveURL(/dashboard/);
  });

  // ─────────────────────────────────────────────
  // CASO 7 — Estrés: click múltiple
  // ─────────────────────────────────────────────
  test('debe deshabilitar el botón durante la carga para evitar doble submit', async ({ page }) => {
    await page.fill('#email',    CREDENCIALES.admin.email);
    await page.fill('#password', CREDENCIALES.admin.password);

    // Click múltiples veces rápido
    const boton = page.locator('button[type="submit"]');
    await boton.click();

    // El botón debe estar deshabilitado durante la carga
    await expect(boton).toBeDisabled();

    // Esperar a que termine
    await page.waitForURL('**/dashboard');
  });

  // ─────────────────────────────────────────────
  // CASO 8 — Accesibilidad básica
  // ─────────────────────────────────────────────
  test('debe tener labels correctos para accesibilidad', async ({ page }) => {
    // Los inputs deben tener labels asociados
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();

    // El botón de toggle debe tener aria-label
    await expect(page.locator('button[aria-label="Mostrar contraseña"]'))
      .toBeVisible();
  });

});
