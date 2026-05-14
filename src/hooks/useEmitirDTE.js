// src/hooks/useEmitirDTE.js
// Hook para emitir DTEs — FCF, CCF, FSE
// Cálculo de totales completo según estructura Hacienda

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast }       from 'react-hot-toast';
import { emitirFCFApi, emitirCCFApi, emitirFSEApi } from '../api/dtes.api';

// ─────────────────────────────────────────────
// CÁLCULO DE TOTALES — estructura completa Hacienda
// ─────────────────────────────────────────────
export const calcularTotales = (items = [], tipoDte = '01') => {
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

    const subtotalItem  = cantidad * precio;
    const montoDescuento = subtotalItem * (pct / 100);
    // ventaGravada = subtotal - descuento - noSuj - exenta
    const gravada = Math.max(0, subtotalItem - montoDescuento - noSuj - exenta);

    totalNoSuj   += noSuj;
    totalExenta  += exenta;
    totalGravada += tipoDte === '14' ? gravada : gravada;
    totalDescu   += montoDescuento;
  }

  const r = (n) => Math.round(n * 100) / 100;

  totalNoSuj   = r(totalNoSuj);
  totalExenta  = r(totalExenta);
  totalGravada = r(totalGravada);
  totalDescu   = r(totalDescu);

  const subTotalVentas = r(totalNoSuj + totalExenta + totalGravada);
  const subTotal       = r(subTotalVentas - totalDescu);

  // IVA solo en FCF y CCF
  let ivaValor = 0;
  if (tipoDte === '03') {
    ivaValor = r(totalGravada * 0.13);
  } else if (tipoDte === '01') {
    ivaValor = r(totalGravada - totalGravada / 1.13);
    totalGravada = r(totalGravada / 1.13); // base sin IVA para FCF
  }

  const montoTotalOperacion = tipoDte === '03'
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
// HOOK
// ─────────────────────────────────────────────
export const useEmitirDTE = () => {
  const navigate = useNavigate();

  const emitir = useCallback(async ({
    tipoDte, receptor, items, pagos,
    condicionOperacion, extension, passwordPri,
  }) => {
    const totales = calcularTotales(items, tipoDte);

    const itemsMapeados = items.map((item) => {
      const cantidad   = Number(item.cantidad)        || 0;
      const precio     = Number(item.precio_unitario) || 0;
      const pct        = Math.min(Number(item.descuento_pct) || 0, 99.99);
      const descuento  = Math.round(cantidad * precio * (pct / 100) * 100) / 100;
      return {
        descripcion:     item.descripcion,
        cantidad,
        precio_unitario: precio,
        descuento,
        tipo_item:       Number(item.tipo_item)   || 2,
        uni_medida:      Number(item.uni_medida)  || 59,
        venta_no_suj:    Number(item.venta_no_suj)  || 0,
        venta_exenta:    Number(item.venta_exenta)   || 0,
      };
    });

    const cuerpo = {
      receptor,
      items:               itemsMapeados,
      condicion_operacion: condicionOperacion || 1,
      pagos:               pagos || null,
      extension:           extension || null,
      password_pri:        passwordPri,
    };

    try {
      let resultado;
      if      (tipoDte === '01') resultado = await emitirFCFApi(cuerpo);
      else if (tipoDte === '03') resultado = await emitirCCFApi(cuerpo);
      else if (tipoDte === '14') resultado = await emitirFSEApi(cuerpo);
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
