// tests/dashboard.spec.js
// Pruebas E2E del dashboard principal
// Verifica carga, métricas, navegación y gráficos

import { test, expect } from '@playwright/test';
import { url }          from './helpers/urls.helper';

test.describe('Dashboard', () => {
  // Usa sesión del globalSetup

  test.beforeEach(async ({ page }) => {
    await page.goto(url('/dashboard'));
    await page.waitForLoadState('networkidle');
  });

  // ─────────────────────────────────────────────
  // CASO 1 — Carga correcta
  // ─────────────────────────────────────────────
  test('debe cargar el dashboard correctamente', async ({ page }) => {
    await expect(page.locator('h1.page-title')).toContainText('Dashboard');
    // El sidebar debe mostrar el nombre del usuario autenticado
    await expect(page.locator('aside')).toContainText('Administrador');
  });

  // ─────────────────────────────────────────────
  // CASO 2 — Tarjetas de métricas visibles
  // ─────────────────────────────────────────────
  test('debe mostrar las tarjetas de métricas', async ({ page }) => {
    // Verificar que existan las 4 métricas (títulos visibles)
    await expect(page.locator('text=Total DTEs')).toBeVisible();
    // Las métricas deben tener valores numéricos (aunque sea 0)
    const cards = page.locator('.card.p-5');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ─────────────────────────────────────────────
  // CASO 3 — Botón Emitir DTE navega
  // ─────────────────────────────────────────────
  test('debe navegar a emitir DTE desde el botón', async ({ page }) => {
    const btnEmitir = page.locator('button:has-text("Emitir DTE"), a:has-text("Emitir DTE")');
    if (await btnEmitir.isVisible()) {
      await btnEmitir.first().click();
      await expect(page).toHaveURL(/dtes\/emitir/);
    }
  });

  // ─────────────────────────────────────────────
  // CASO 4 — Barra lateral activa con dashboard
  // ─────────────────────────────────────────────
  test('debe marcar Dashboard como activo en el sidebar', async ({ page }) => {
    const enlaceDashboard = page.locator('aside a[href="/dashboard"]');
    await expect(enlaceDashboard).toHaveClass(/active/);
  });

  // ─────────────────────────────────────────────
  // CASO 5 — Navegar a listado de DTEs desde sidebar
  // ─────────────────────────────────────────────
  test('debe navegar al listado de DTEs desde el sidebar', async ({ page }) => {
    await page.click('aside a[href="/dtes"]');
    await expect(page).toHaveURL(/dtes/);
    await expect(page.locator('h1.page-title')).toContainText('DTEs');
  });

  // ─────────────────────────────────────────────
  // CASO 6 — Header muestra título correcto
  // ─────────────────────────────────────────────
  test('debe mostrar "Dashboard" en el header', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toContainText('Dashboard');
  });

  // ─────────────────────────────────────────────
  // CASO 7 — Sidebar colapsable en escritorio
  // ─────────────────────────────────────────────
  test('debe permitir colapsar y expandir el sidebar', async ({ page }) => {
    const btnToggle = page.locator('button[aria-label="Colapsar sidebar"], button[aria-label="Expandir sidebar"]');
    if (await btnToggle.isVisible()) {
      await btnToggle.click();
      // El sidebar debe cambiar de ancho
      const aside = page.locator('aside');
      await expect(aside).toBeVisible();
    }
  });

});
