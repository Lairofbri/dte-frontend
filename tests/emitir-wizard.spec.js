// tests/emitir-wizard.spec.js
// Pruebas E2E del wizard de emisión (DTEEmitir en pasos).
// Cubre el flujo mínimo FCF: tipo → consumidor final → ítems → pago → resumen,
// y verifica que NO exista el campo de contraseña de firma (firma interna).

import { test, expect } from '@playwright/test';
import { url } from './helpers/urls.helper';

const erroresPagina = [];

test.describe('DTE — Wizard de emisión', () => {
  // Serial para evitar interferencia entre tests del mismo flujo
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    erroresPagina.length = 0;
    page.on('pageerror', (err) => erroresPagina.push(err.message));
    await page.goto(url('/dtes/emitir'));
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(() => {
    expect(erroresPagina, 'Errores de runtime en la página').toEqual([]);
  });

  // ─────────────────────────────────────────────
  // CASO 1 — Paso 1: las 5 tarjetas de tipo de documento
  // ─────────────────────────────────────────────
  test('debe mostrar las 5 tarjetas de tipo de documento', async ({ page }) => {
    await expect(page.locator('h1.page-title')).toContainText('Emitir DTE');
    await expect(page.getByText('Factura Consumidor Final')).toBeVisible();
    await expect(page.getByText('Comprobante de Crédito Fiscal')).toBeVisible();
    await expect(page.getByText('Nota de Crédito')).toBeVisible();
    await expect(page.getByText('Nota de Débito')).toBeVisible();
    await expect(page.getByText('Factura Sujeto Excluido')).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // CASO 2 — Navegación del stepper (atrás/adelante)
  // ─────────────────────────────────────────────
  test('debe navegar entre pasos con Atrás', async ({ page }) => {
    await page.getByRole('button', { name: /Continuar/ }).click();
    await expect(page.getByText('Cliente guardado')).toBeVisible();

    await page.getByRole('button', { name: /Atrás/ }).click();
    await expect(page.getByText('¿Qué documento necesitás emitir?')).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // CASO 3 — Flujo FCF completo: consumidor final sin datos
  // ─────────────────────────────────────────────
  test('debe emitir el flujo FCF minimalista hasta el resumen', async ({ page }) => {
    // Paso 1 → FCF está seleccionado por defecto; continuar
    await page.getByRole('button', { name: /Continuar/ }).click();

    // Paso 2 → aviso de receptor opcional + Consumidor final
    await expect(page.getByText('Receptor opcional en FCF')).toBeVisible();
    await page.getByRole('button', { name: /Consumidor final/ }).first().click();
    await page.getByRole('button', { name: /Continuar/ }).click();

    // Paso 3 → ítems: descripción, cantidad y precio
    await page.getByLabel('Descripción').fill('Producto de prueba E2E');
    await page.getByLabel('Precio').fill('10.00');
    await expect(page.getByText('$10.00', { exact: false }).first()).toBeVisible();

    // El panel de totales debe mostrar el total calculado
    await page.getByRole('button', { name: /Continuar/ }).click();

    // Paso 4 → pago rápido en efectivo (condición contado por defecto)
    await expect(page.getByText('Pago rápido en efectivo')).toBeVisible();
    await expect(page.getByText('Total a pagar')).toBeVisible();

    // Los catálogos de Hacienda deben venir de la API (no hardcoded)
    await page.locator('#pago-0-codigo').click();
    await expect(page.getByRole('option', { name: /Billetes y monedas/ })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Continuar/ }).click();

    // Paso 5 → resumen: consumidor final + ítem + SIN campo de contraseña
    await expect(page.getByText('Consumidor final — sin datos')).toBeVisible();
    await expect(page.getByText('Producto de prueba E2E')).toBeVisible();
    await expect(page.getByLabel('Contraseña de firma')).toHaveCount(0);
    await expect(page.getByText(/se firma automáticamente con el certificado/)).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // CASO 4 — FCF con datos del receptor (toggle)
  // ─────────────────────────────────────────────
  test('debe mostrar los campos del receptor al elegir "Agregar datos"', async ({ page }) => {
    await page.getByRole('button', { name: /Continuar/ }).click();

    await page.getByRole('button', { name: /Agregar datos del cliente/ }).click();
    await expect(page.getByLabel('Nombre / razón social')).toBeVisible();
    await expect(page.getByLabel('Tipo de documento')).toBeVisible();
    await expect(page.getByLabel('Correo')).toBeVisible();
  });
});