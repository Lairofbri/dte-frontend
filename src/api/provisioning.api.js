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

// POST /api/provisioning/tenants/:tenantId/habilitar-pos — habilita POS en una
// empresa creada "solo DTE" (rol plataforma). Devuelve la API Key técnica UNA
// sola vez (el valor nunca se vuelve a exponer).
export const habilitarPosTenantApi = async (tenantId, datos) => {
  const { data } = await api.post(`/api/provisioning/tenants/${tenantId}/habilitar-pos`, datos);
  return data.data;
};

// POST /api/provisioning/tenants/:tenantId/reintentar-sync — destraba la
// entrega de eventos al POS (re-publica TENANT_CREADO y reactiva los fallidos).
export const reintentarSyncTenantApi = async (tenantId) => {
  const { data } = await api.post(`/api/provisioning/tenants/${tenantId}/reintentar-sync`);
  return data.data;
};

// PUT /api/provisioning/tenants/:tenantId/logo — logo de la empresa para el
// encabezado del PDF fiscal (rol administrador del tenant o plataforma).
// Va como multipart/form-data (campo `logo`). El Content-Type se fija a
// multipart a propósito: la instancia compartida usa application/json por
// defecto y, con ese valor, axios serializaría el FormData a JSON. En el
// navegador axios quita el header y deja que el browser agregue el boundary.
// El backend valida PNG ≤ 1 MB y normaliza a 600×200 px (sharp).
export const actualizarLogoTenantApi = async (tenantId, archivo) => {
  const formulario = new FormData();
  formulario.append('logo', archivo);
  const { data } = await api.put(
    `/api/provisioning/tenants/${tenantId}/logo`,
    formulario,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.data;
};

// DELETE /api/provisioning/tenants/:tenantId/logo — quita el logo. El PDF
// vuelve a generarse sin imagen (nunca se usa un placeholder).
export const eliminarLogoTenantApi = async (tenantId) => {
  const { data } = await api.delete(`/api/provisioning/tenants/${tenantId}/logo`);
  return data.data;
};
