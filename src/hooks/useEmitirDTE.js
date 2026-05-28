// src/hooks/useEmitirDTE.js
// Hook para emitir DTEs — FCF, CCF, FSE, NC, ND
// Cálculo de totales completo según estructura Hacienda v2/v3/v4

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast }       from 'react-hot-toast';
import {
  emitirFCFApi, emitirCCFApi, emitirFSEApi,
  emitirNotaCreditoApi, emitirNotaDebitoApi,
} from '../api/dtes.api';

// ─────────────────────────────────────────────
// CÁLCULO DE TOTALES — estructura completa Hacienda
// ─────────────────────────────────────────────
export const calcularTotales = (items = [], tipoDte = '01') => {
  // FSE tiene estructura de totales completamente diferente
  if (tipoDte === '14') return calcularTotalesFSE(items);

  let totalNoSuj   = 0;
  let totalExenta  = 0;
  let totalGravada = 0;
  let totalDescu   = 0;

  for (const item of items) {
    const cantidad   = Number(item.cantidad)        || 0;
    const precio     = Number(item.precio_unitario) || 0;
    const pct        = Math.min(Number(item.descuento_pct) || 0, 99.99);
    const noSuj      = Number(item.venta_no_suj)    || 0;
    const exenta     = Number(item.venta_exenta)    || 0;

    const subtotalItem   = cantidad * precio;
    const montoDescuento = subtotalItem * (pct / 100);
    // ventaGravada = subtotal - descuento - noSuj - exenta
    const gravada = Math.max(0, subtotalItem - montoDescuento - noSuj - exenta);

    totalNoSuj   += noSuj;
    totalExenta  += exenta;
    totalGravada += gravada;
    totalDescu   += montoDescuento;
  }

  const r = (n) => Math.round(n * 100) / 100;

  totalNoSuj   = r(totalNoSuj);
  totalExenta  = r(totalExenta);
  totalGravada = r(totalGravada);
  totalDescu   = r(totalDescu);

  const subTotalVentas = r(totalNoSuj + totalExenta + totalGravada);
  const subTotal       = r(subTotalVentas - totalDescu);

  // IVA — FCF usa base con IVA incluido, CCF/NC/ND usan base sin IVA
  let ivaValor = 0;
  if (tipoDte === '03' || tipoDte === '05' || tipoDte === '06') {
    ivaValor = r(totalGravada * 0.13);
  } else if (tipoDte === '01') {
    ivaValor = r(totalGravada - totalGravada / 1.13);
    totalGravada = r(totalGravada / 1.13); // base sin IVA para FCF
  }

  const montoTotalOperacion = (tipoDte === '03' || tipoDte === '05' || tipoDte === '06')
    ? r(subTotal + ivaValor)
    : r(subTotal);

  return {
    totalNoSuj,
    totalExenta,
    totalGravada,
    subTotalVentas,
    descuGravada: totalDescu,
    subTotal,
    ivaValor,
    montoTotalOperacion,
    totalPagar: montoTotalOperacion,
  };
};

// ─────────────────────────────────────────────
// CÁLCULO DE TOTALES — FSE (estructura diferente)
// ─────────────────────────────────────────────
const calcularTotalesFSE = (items = []) => {
  let totalCompra = 0;
  let totalDescu  = 0;

  for (const item of items) {
    const cantidad = Number(item.cantidad)        || 0;
    const precio   = Number(item.precio_unitario) || 0;
    const pct      = Math.min(Number(item.descuento_pct) || 0, 99.99);

    const compraItem     = cantidad * precio;
    const montoDescuento = compraItem * (pct / 100);

    totalCompra += compraItem;
    totalDescu  += montoDescuento;
  }

  const r = (n) => Math.round(n * 100) / 100;
  totalCompra = r(totalCompra);
  totalDescu  = r(totalDescu);

  // FSE no tiene IVA, no tiene tributos
  // reteRenta es 0 por defecto (el backend puede ajustarlo)
  const subTotal  = r(totalCompra - totalDescu);
  const totalPagar = subTotal; // Sin IVA, sin tributos en FSE

  return {
    totalNoSuj:   0,
    totalExenta:  0,
    totalGravada: 0,
    subTotalVentas: 0,
    descuGravada: totalDescu,
    subTotal:       0,
    ivaValor:       0,
    montoTotalOperacion: 0,
    totalPagar,
    // Campos específicos FSE
    totalCompra,
    totalDescuFSE: totalDescu,
    subTotalFSE: subTotal,
    reteRenta: 0,
  };
};

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────
export const useEmitirDTE = () => {
  const navigate = useNavigate();

  const emitir = useCallback(async ({
    tipoDte, receptor, items, pagos,
    condicionOperacion, extension, passwordPri,
    documentoRelacionado, fusion, observaciones,
  }) => {
    const esFSE   = tipoDte === '14';
    const esNC    = tipoDte === '05';
    const esND    = tipoDte === '06';

    const itemsMapeados = items.map((item) => {
      const cantidad   = Number(item.cantidad)        || 0;
      const precio     = Number(item.precio_unitario) || 0;
      const pct        = Math.min(Number(item.descuento_pct) || 0, 99.99);
      const descuento  = Math.round(cantidad * precio * (pct / 100) * 100) / 100;

      const mapped = {
        descripcion:     item.descripcion,
        cantidad,
        precio_unitario: precio,
        descuento,
        tipo_item:       Number(item.tipo_item)   || 2,
        uni_medida:      Number(item.uni_medida)  || 59,
      };

      // FSE: campo compra en vez de venta_gravada/venta_no_suj/venta_exenta
      if (esFSE) {
        mapped.compra = Math.round((cantidad * precio - descuento) * 100) / 100;
      } else {
        mapped.venta_no_suj = Number(item.venta_no_suj) || 0;
        mapped.venta_exenta = Number(item.venta_exenta) || 0;
      }

      return mapped;
    });

    const cuerpo = {
      receptor,
      items:               itemsMapeados,
      condicion_operacion: condicionOperacion || 1,
      pagos:               pagos || null,
      extension:           extension || null,
      password_pri:        passwordPri,
    };

    // NC/ND: documento_relacionado requerido
    if ((esNC || esND) && documentoRelacionado) {
      cuerpo.documento_relacionado = {
        codigo_generacion: documentoRelacionado.codigo_generacion,
        tipo_dte:          documentoRelacionado.tipo_dte,
        fecha_emision:     documentoRelacionado.fecha_emision,
      };
    }

    // NC/ND: fusion (opcional)
    if ((esNC || esND) && fusion) {
      cuerpo.fusion = fusion;
    }

    // NC/ND + FSE: observaciones en raíz del JSON
    if ((esNC || esND || esFSE) && observaciones) {
      cuerpo.observaciones = observaciones;
    }

    try {
      let resultado;
      if      (tipoDte === '01') resultado = await emitirFCFApi(cuerpo);
      else if (tipoDte === '03') resultado = await emitirCCFApi(cuerpo);
      else if (tipoDte === '14') resultado = await emitirFSEApi(cuerpo);
      else if (tipoDte === '05') resultado = await emitirNotaCreditoApi(cuerpo);
      else if (tipoDte === '06') resultado = await emitirNotaDebitoApi(cuerpo);
      else throw new Error('Tipo de DTE no soportado.');

      toast.success('DTE emitido correctamente.');
      navigate(`/dtes/${resultado.codigo_generacion}`);
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || 'No se pudo emitir el DTE.';
      toast.error(mensaje);
      throw err;
    }
  }, [navigate]);

  return { emitir };
};
