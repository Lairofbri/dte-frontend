// src/api/dtes.api.js
// Funciones que consumen los endpoints del DTE Service
// Principio S: solo habla con el backend, no maneja estado

import api from './axios';

/**
 * Listar DTEs con filtros y paginación
 */
export const listarDTEsApi = async (filtros = {}) => {
  const { data } = await api.get('/api/dte', { params: filtros });
  return data.data;
};

/**
 * Obtener detalle de un DTE por código de generación
 */
export const obtenerDTEApi = async (codigoGeneracion) => {
  const { data } = await api.get(`/api/dte/${codigoGeneracion}`);
  return data.data;
};

/**
 * Comprobante fiscal en **bytes ESC/POS** para el agente local (AmberPrint).
 * No imprime ni modifica nada: reimprimir es idempotente respecto de la emisión.
 * El backend responde **409** si el DTE todavía no está `aceptado`.
 * `papel_mm`/`caracteres_x_linea` salen de las preferencias del agente (por equipo).
 */
export const obtenerTicketEscposApi = async (codigoGeneracion, { papelMm, caracteresXLinea } = {}) => {
  const { data } = await api.get(`/api/dte/${codigoGeneracion}/ticket-escpos`, {
    params: {
      ...(papelMm ? { papel_mm: papelMm } : {}),
      ...(caracteresXLinea ? { caracteres_x_linea: caracteresXLinea } : {}),
    },
    responseType: 'arraybuffer',
  });
  return new Uint8Array(data);
};

/**
 * Emitir una Factura Consumidor Final (FCF)
 */
export const emitirFCFApi = async (datos) => {
  const { data } = await api.post('/api/dte/emitir/fcf', datos);
  return data.data;
};

/**
 * Emitir un Comprobante de Crédito Fiscal (CCF)
 */
export const emitirCCFApi = async (datos) => {
  const { data } = await api.post('/api/dte/emitir/ccf', datos);
  return data.data;
};

/**
 * Emitir una Nota de Crédito
 */
export const emitirNotaCreditoApi = async (datos) => {
  const { data } = await api.post('/api/dte/emitir/nota-credito', datos);
  return data.data;
};

/**
 * Emitir una Nota de Débito
 */
export const emitirNotaDebitoApi = async (datos) => {
  const { data } = await api.post('/api/dte/emitir/nota-debito', datos);
  return data.data;
};

/**
 * Emitir una Factura de Sujeto Excluido (FSE)
 */
export const emitirFSEApi = async (datos) => {
  const { data } = await api.post('/api/dte/emitir/fse', datos);
  return data.data;
};

/**
 * Anular un DTE existente
 */
export const anularDTEApi = async (datos) => {
  const { data } = await api.post('/api/dte/anular', datos);
  return data.data;
};
