// src/api/configuracion.api.js
// Funciones que consumen los endpoints de configuración del DTE Service

import api from './axios';

/**
 * Obtener configuración actual del emisor
 */
export const obtenerConfiguracionApi = async () => {
  const { data } = await api.get('/api/configuracion');
  return data.data;
};

/**
 * Actualizar configuración del emisor
 */
export const actualizarConfiguracionApi = async (datos) => {
  const { data } = await api.patch('/api/configuracion', datos);
  return data.data;
};

/**
 * Test de conexión con el firmador
 */
export const testFirmadorApi = async () => {
  const { data } = await api.get('/api/firmador/estado');
  return data.data;
};
