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
