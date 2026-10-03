// src/api/catalogos.api.js
// Funciones que consumen los endpoints de catálogos oficiales de Hacienda
// (dte-service, migración 027 — CAT-001 a CAT-033)

import api from './axios';

/**
 * Obtener el listado código/descripción de un catálogo de Hacienda.
 * @param {string} catalogo — slug del catálogo (ej: 'actividad-economica')
 */
export const obtenerCatalogoApi = async (catalogo) => {
  const { data } = await api.get(`/api/catalogos/${catalogo}`);
  return data.data;
};