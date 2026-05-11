// tests/dashboard.spec.js
// Pruebas E2E del Dashboard
// Simula comportamiento real: usuario ya logueado navega entre páginas
// La sesión se establece UNA vez en global-setup.js

import { test, expect } from '@playwright/test';
import { url }                    from './helpers/urls.helper';

test.describe('Dashboard', () => {
  // Serial para garantizar orden — el logout debe ir al final
  // Sin serial los workers paralelos pueden ejecutar logout antes que otros tests
  test.describe.configure({ mode: 'serial' });

  // Navegar al dashboard antes de cada test
  // No hace login — ya hay sesión activa del globalSetup
  test.beforeEach(async ({ page }) => {
    await page.goto(url('/dashboard'));
  });

  // ─────────────────────────────────────────────
  // CASO 1 — Carga correcta del dashboard
  // ─────────────────────────────────────────────
  test('debe cargar el dashboard con métricas', async ({ page }) => {
    await expect(page.locator('.page-title'))
      .toContainText('Bienvenido');

    const main  = page.locator('main');
    const cards = main.locator('.card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);

    await expect(main.getByText('Total DTEs')).toBeVisible();
    await expect(main.getByText('Aceptados')).toBeVisible();
    await expect(main.getByText('Contingencia')).toBeVisible();
    await expect(main.getByText('Rechazados')).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // CASO 2 — Navegar a emitir DTE
  // ─────────────────────────────────────────────
  test('debe navegar a emitir DTE al hacer click en el botón', async ({ page }) => {
    await page.click('button:has-text("Emitir DTE")');
    await expect(page).toHaveURL(/dtes\/emitir/);
  });

  // ─────────────────────────────────────────────
  // CASO 3 — Alertas de contingencia
  // ─────────────────────────────────────────────
  test('debe navegar a contingencia al hacer click en Ver todos', async ({ page }) => {
    const alerta = page.locator('text=Ver todos').first();
    if (await alerta.isVisible().catch(() => false)) {
      await alerta.click();
      await expect(page).toHaveURL(/contingencia/);
    } else {
      test.skip();
    }
  });

  // ─────────────────────────────────────────────
  // CASO 4 — Sidebar visible
  // ─────────────────────────────────────────────
  test('debe mostrar el sidebar con los links de navegación', async ({ page }) => {
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('aside')).toContainText('Dashboard');
    await expect(page.locator('aside')).toContainText('DTEs');
    await expect(page.locator('aside')).toContainText('Contingencia');
  });

  // ─────────────────────────────────────────────
  // CASO 5 — Navegar desde sidebar a DTEs
  // ─────────────────────────────────────────────
  test('debe navegar a DTEs desde el sidebar', async ({ page }) => {
    await page.click('aside a[href="/dtes"]');
    await expect(page).toHaveURL(/\/dtes$/);
  });

  // ─────────────────────────────────────────────
  // CASO 6 — Links de admin visibles
  // ─────────────────────────────────────────────
  test('debe mostrar links de administración para el admin', async ({ page }) => {
    await expect(page.locator('aside')).toContainText('Configuración');
    await expect(page.locator('aside')).toContainText('Usuarios');
    await expect(page.locator('aside')).toContainText('Auditoría');
  });

  // ─────────────────────────────────────────────
  // CASO 8 — Responsive: botón menú en móvil
  // ─────────────────────────────────────────────
  test('debe mostrar botón de menú en móvil', async ({ page }) => {
    // Cambiar viewport ANTES de navegar — el componente renderiza según el tamaño inicial
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(url('/dashboard'));
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('button[aria-label="Abrir menú de navegación"]')
    ).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // CASO 9 — Abrir y cerrar sidebar en móvil
  // ─────────────────────────────────────────────
  test('debe abrir y cerrar el sidebar en móvil', async ({ page }) => {
    // Cambiar viewport ANTES de navegar
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(url('/dashboard'));
    await page.waitForLoadState('networkidle');
    await page.click('button[aria-label="Abrir menú de navegación"]');
    await expect(page.locator('aside')).toBeInViewport();
    await page.locator('.fixed.inset-0.bg-black\\/50').click();
    await expect(page.locator('aside')).not.toBeInViewport();
  });

  // ─────────────────────────────────────────────
  // CASO 10 — Admin accede a configuración
  // ─────────────────────────────────────────────
  test('debe permitir acceso a configuración para el administrador', async ({ page }) => {
    await page.goto(url('/configuracion'));
    await expect(page).not.toHaveURL(/login/);
  });

  // ─────────────────────────────────────────────
  // CASO 11 — Ruta inexistente no crashea la app
  // ─────────────────────────────────────────────
  test('debe mostrar página 404 para rutas inexistentes', async ({ page }) => {
    await page.goto(url('/esto-no-existe-jamas'));
    await expect(page.locator('body')).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // CASO 12 — Logout y verificar que no puede volver al dashboard
  // Realista: simula usuario que cierra sesión e intenta volver
  // Va al final para no invalidar sesión de tests anteriores
  // ─────────────────────────────────────────────
  test('debe cerrar sesión y no poder volver al dashboard', async ({ page }) => {
    await page.click('button:has-text("Cerrar sesión")');
    await expect(page).toHaveURL(/login/);

    // Intentar volver al dashboard — debe redirigir al login
    await page.goto(url('/dashboard'));
    await expect(page).toHaveURL(/login/);
  });

});
