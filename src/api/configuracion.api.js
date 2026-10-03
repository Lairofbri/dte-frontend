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

/**
 * Probar conexión con Hacienda usando las credenciales guardadas.
 * El backend NUNCA devuelve el token — solo confirma la conexión.
 */
export const testHaciendaApi = async () => {
  const { data } = await api.post('/api/configuracion/test-hacienda');
  return data.data;
};

/**
 * Estado de certificado/firma por tenant (Fase 4).
 * Señales operativas — nunca contraseñas ni certificados.
 */
export const obtenerEstadoFirmaApi = async () => {
  const { data } = await api.get('/api/configuracion/estado-firma');
  return data.data;
};
