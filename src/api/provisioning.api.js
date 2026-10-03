// src/api/provisioning.api.js
// Estado de provisión de empresas (Fase 2) — visible al administrador DTE
// y a usuarios de plataforma (alta de empresas).

import api from './axios';

// GET /api/provisioning/status — estado de onboarding.
// Plataforma: todos los tenants | Administrador: solo su tenant.
export const obtenerEstadoProvisionApi = async () => {
  const { data } = await api.get('/api/provisioning/status');
  return data.data;
};

// POST /api/provisioning/tenants — alta de empresa desde DTE (rol plataforma).
export const crearTenantPlataformaApi = async (datos) => {
  const { data } = await api.post('/api/provisioning/tenants', datos);
  return data.data;
};