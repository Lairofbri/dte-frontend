// src/api/auditoria.api.js
// Funciones que consumen los endpoints de auditoría del DTE Service

import api from './axios';

/**
 * Obtener resumen estadístico de auditoría
 * → eventos de las últimas 24h
 * → DTEs por estado
 * → último evento
 */
export const obtenerResumenApi = async () => {
  const { data } = await api.get('/api/auditoria/resumen');
  return data.data;
};

/**
 * Listar registros de auditoría con filtros
 */
export const listarAuditoriaApi = async (filtros = {}) => {
  const { data } = await api.get('/api/auditoria', { params: filtros });
  return data.data;
};

/**
 * Obtener detalle de un registro de auditoría
 */
export const obtenerRegistroApi = async (id) => {
  const { data } = await api.get(`/api/auditoria/${id}`);
  return data.data;
};
