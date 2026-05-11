// tests/dtes-listado.spec.js
// Pruebas E2E del listado de DTEs
// Simula comportamiento real: usuario navega, filtra y busca DTEs

import { test, expect } from '@playwright/test';
import { url }          from './helpers/urls.helper';

test.describe('DTEs — Listado', () => {
  // Serial para evitar interferencia entre tests
  test.describe.configure({ mode: 'serial' });

  // Navegar al listado antes de cada test
  // Sesión activa del globalSetup
  test.beforeEach(async ({ page }) => {
    await page.goto(url('/dtes'));
    await page.waitForLoadState('networkidle');
  });

  // ─────────────────────────────────────────────
  // CASO 1 — Carga correcta del listado
  // ─────────────────────────────────────────────
  test('debe cargar la página de DTEs correctamente', async ({ page }) => {
    await expect(page.locator('h1.page-title')).toContainText('DTEs');
    await expect(page.locator('button:has-text("Emitir DTE")')).toBeVisible();
    // La tabla o el empty state deben ser visibles
    const tabla      = page.locator('table');
    const emptyState = page.locator('text=Sin DTEs');
    const visible    = await tabla.isVisible().catch(() => false) ||
                       await emptyState.isVisible().catch(() => false);
    expect(visible).toBe(true);
  });

  // ─────────────────────────────────────────────
  // CASO 2 — Filtros visibles
  // ─────────────────────────────────────────────
  test('debe mostrar los filtros de búsqueda', async ({ page }) => {
    await expect(page.locator('#filtro-tipo')).toBeVisible();
    await expect(page.locator('#filtro-estado')).toBeVisible();
    await expect(page.locator('#filtro-desde')).toBeVisible();
    await expect(page.locator('#filtro-hasta')).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // CASO 3 — Filtrar por estado actualiza la URL
  // ─────────────────────────────────────────────
  test('debe actualizar la URL al aplicar filtro de estado', async ({ page }) => {
    await page.selectOption('#filtro-estado', 'aceptado');
    // La URL debe incluir el filtro
    await expect(page).toHaveURL(/estado=aceptado/);
  });

  // ─────────────────────────────────────────────
  // CASO 4 — Filtrar por tipo actualiza la URL
  // ─────────────────────────────────────────────
  test('debe actualizar la URL al aplicar filtro de tipo', async ({ page }) => {
    await page.selectOption('#filtro-tipo', '01');
    await expect(page).toHaveURL(/tipo_dte=01/);
  });

  // ─────────────────────────────────────────────
  // CASO 5 — Limpiar filtros elimina los params de la URL
  // ─────────────────────────────────────────────
  test('debe limpiar los filtros correctamente', async ({ page }) => {
    // Aplicar un filtro
    await page.selectOption('#filtro-estado', 'aceptado');
    await expect(page).toHaveURL(/estado=aceptado/);

    // Limpiar
    await page.click('button[aria-label="Limpiar todos los filtros"]');
    await expect(page).not.toHaveURL(/estado=/);
  });

  // ─────────────────────────────────────────────
  // CASO 6 — La URL con filtros persiste al recargar
  // ─────────────────────────────────────────────
  test('debe mantener los filtros al recargar la página', async ({ page }) => {
    await page.selectOption('#filtro-estado', 'aceptado');
    await expect(page).toHaveURL(/estado=aceptado/);

    // Recargar la página
    await page.reload();
    await page.waitForLoadState('networkidle');

    // El filtro debe seguir aplicado
    await expect(page.locator('#filtro-estado')).toHaveValue('aceptado');
  });

  // ─────────────────────────────────────────────
  // CASO 7 — Navegar a emitir DTE
  // ─────────────────────────────────────────────
  test('debe navegar a emitir DTE desde el botón', async ({ page }) => {
    await page.click('button:has-text("Emitir DTE")');
    await expect(page).toHaveURL(/dtes\/emitir/);
  });

  // ─────────────────────────────────────────────
  // CASO 8 — Click en fila navega al detalle
  // ─────────────────────────────────────────────
  test('debe navegar al detalle al hacer click en un DTE', async ({ page }) => {
    const filas = page.locator('table tbody tr');
    const count = await filas.count();

    if (count > 0) {
      await filas.first().click();
      // Debe navegar al detalle — URL contiene un UUID
      await expect(page).toHaveURL(
        /dtes\/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/
      );
    } else {
      // Si no hay DTEs el test se salta — no es un error
      test.skip();
    }
  });

  // ─────────────────────────────────────────────
  // CASO 9 — Responsive: tabla visible en móvil
  // ─────────────────────────────────────────────
  test('debe mostrar la tabla en móvil sin overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(url('/dtes'));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.table-wrapper')).toBeVisible();
    // Verificar que el contenedor no excede el ancho del viewport
    const tieneOverflow = await page.evaluate(() => {
      const el = document.querySelector('.table-wrapper');
      return el ? el.scrollWidth > el.clientWidth : false;
    });
    expect(tieneOverflow).toBe(false);
  });

  // ─────────────────────────────────────────────
  // CASO 10 — Filtro de fecha actualiza la URL
  // ─────────────────────────────────────────────
  test('debe actualizar la URL con el filtro de fecha', async ({ page }) => {
    await page.fill('#filtro-desde', '2026-01-01');
    await expect(page).toHaveURL(/fecha_desde=2026-01-01/);
  });

  // ─────────────────────────────────────────────
  // CASO 11 — URL compartida aplica los filtros
  // Simula usuario que recibe un enlace con filtros
  // ─────────────────────────────────────────────
  test('debe aplicar filtros desde la URL directamente', async ({ page }) => {
    await page.goto(url('/dtes?estado=aceptado&tipo_dte=01'));
    await page.waitForLoadState('networkidle');

    // Los selects deben reflejar los filtros de la URL
    await expect(page.locator('#filtro-estado')).toHaveValue('aceptado');
    await expect(page.locator('#filtro-tipo')).toHaveValue('01');
  });

});
