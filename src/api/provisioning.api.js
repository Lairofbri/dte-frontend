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

// PATCH /api/provisioning/tenants/:tenantId — editar datos de la empresa
// (rol plataforma). El NIT es inmutable: no se envía.
export const actualizarTenantPlataformaApi = async (tenantId, datos) => {
  const { data } = await api.patch(`/api/provisioning/tenants/${tenantId}`, datos);
  return data.data;
};

// PATCH /api/provisioning/tenants/:tenantId/admin — editar el administrador
// inicial del tenant (rol plataforma). Password vacío = no cambia.
export const actualizarAdminTenantPlataformaApi = async (tenantId, datos) => {
  const { data } = await api.patch(`/api/provisioning/tenants/${tenantId}/admin`, datos);
  return data.data;
};