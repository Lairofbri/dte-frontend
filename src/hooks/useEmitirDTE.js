// src/hooks/useEmitirDTE.js
// Hook para manejar la emisión de DTEs
// Separa la lógica de negocio de la UI

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast }       from 'react-hot-toast';
import {
  emitirFCFApi,
  emitirCCFApi,
  emitirFSEApi,
} from '../api/dtes.api';

// ─────────────────────────────────────────────
// CÁLCULO DE TOTALES
// ─────────────────────────────────────────────

/**
 * Calcular totales según el tipo de DTE
 * FCF: precios con IVA incluido
 * CCF: precios sin IVA — se agrega el 13%
 * FSE: sin IVA
 */
export const calcularTotales = (items = [], tipoDte = '01') => {
  // Calcular subtotal bruto y descuento total por separado
  // descuento_pct: porcentaje de descuento por ítem (0-99.99)
  let subtotalSinDescuento = 0;
  let descuentoTotal       = 0;

  items.forEach((item) => {
    const cantidad      = Number(item.cantidad)        || 0;
    const precio        = Number(item.precio_unitario) || 0;
    const descuentoPct  = Number(item.descuento_pct)   || 0;
    const subtotalItem  = cantidad * precio;
    // Calcular monto de descuento desde el porcentaje
    const montoDescuento = subtotalItem * (descuentoPct / 100);
    subtotalSinDescuento += subtotalItem;
    descuentoTotal       += Math.min(montoDescuento, subtotalItem * 0.9999); // máx 99.99%
  });

  const subtotalBruto = Math.max(0, subtotalSinDescuento - descuentoTotal);

  let totalGravado = 0;
  let totalIva     = 0;
  let totalPagar   = 0;

  if (tipoDte === '03') {
    // CCF: precio sin IVA → agregar 13%
    totalGravado = subtotalBruto;
    totalIva     = subtotalBruto * 0.13;
    totalPagar   = subtotalBruto + totalIva;
  } else if (tipoDte === '14') {
    // FSE: sin IVA
    totalGravado = 0;
    totalIva     = 0;
    totalPagar   = subtotalBruto;
  } else {
    // FCF (01): precio con IVA incluido
    totalGravado = subtotalBruto / 1.13;
    totalIva     = subtotalBruto - totalGravado;
    totalPagar   = subtotalBruto;
  }

  return {
    subtotal:        Number(subtotalBruto.toFixed(2)),
    descuentoTotal:  Number(descuentoTotal.toFixed(2)),
    totalGravado:    Number(totalGravado.toFixed(2)),
    totalIva:        Number(totalIva.toFixed(2)),
    totalPagar:      Number(totalPagar.toFixed(2)),
  };
};

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
export const useEmitirDTE = () => {
  const navigate = useNavigate();

  const emitir = useCallback(async ({ tipoDte, receptor, items, passwordPri }) => {
    const totales = calcularTotales(items, tipoDte);

    // Construir cuerpo del request según el tipo
    const cuerpo = {
      receptor,
      items: items.map((item) => {
        const cantidad      = Number(item.cantidad)        || 0;
        const precio        = Number(item.precio_unitario) || 0;
        const descuentoPct  = Number(item.descuento_pct)   || 0;
        const subtotalItem  = cantidad * precio;
        // Convertir porcentaje a monto fijo para el backend
        // Mismo cap que en calcularTotales — máximo 99.99%
        const pctCapped      = Math.min(descuentoPct, 99.99);
        const montoDescuento = Number((subtotalItem * (pctCapped / 100)).toFixed(2));
        return {
          descripcion:     item.descripcion,
          cantidad,
          precio_unitario: precio,
          descuento:       montoDescuento,
        };
      }),
      totales,
      password_pri: passwordPri,
    };

    try {
      let resultado;
      if (tipoDte === '01') resultado = await emitirFCFApi(cuerpo);
      else if (tipoDte === '03') resultado = await emitirCCFApi(cuerpo);
      else if (tipoDte === '14') resultado = await emitirFSEApi(cuerpo);
      else throw new Error('Tipo de DTE no soportado.');

      toast.success('DTE emitido correctamente.');
      // Navegar al detalle del DTE recién emitido
      navigate(`/dtes/${resultado.codigo_generacion}`);
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || 'No se pudo emitir el DTE.';
      toast.error(mensaje);
      // Re-lanzar para que el componente pueda limpiar el passwordPri
      throw err;
    }
  }, [navigate]);

  return { emitir };
};
