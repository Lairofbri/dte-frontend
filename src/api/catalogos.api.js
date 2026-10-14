// src/api/catalogos.api.js
// Funciones que consumen los endpoints de catálogos oficiales de Hacienda
// (dte-service, migración 027 — CAT-001 a CAT-033)

import api from './axios';

/**
 * Obtener el listado código/descripción de un catálogo de Hacienda.
 * Los catálogos territoriales (municipio CAT-013, distrito CAT-008) repiten
 * códigos entre departamentos: se deben consultar SIEMPRE con `departamento`
 * (2 dígitos) — migración 034.
 * @param {string} catalogo — slug del catálogo (ej: 'municipio', 'distrito')
 * @param {{ departamento?: string }} [opciones]
 */
export const obtenerCatalogoApi = async (catalogo, { departamento } = {}) => {
  const { data } = await api.get(`/api/catalogos/${catalogo}`, {
    params: departamento ? { departamento } : undefined,
  });
  return data.data;
};
