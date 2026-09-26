// src/api/tenants.api.js
// Consulta pública de empresas disponibles para el login.

import api from './axios';

export const listarTenantsApi = async () => {
  const { data } = await api.get('/api/tenants');
  return data.data;
};
