// src/api/establecimientos.api.js
// Funciones que consumen los endpoints de establecimientos del DTE Service

import api from './axios';

export const listarEstablecimientosApi = async () => {
  const { data } = await api.get('/api/establecimientos');
  return data.data;
};

export const crearEstablecimientoApi = async (datos) => {
  const { data } = await api.post('/api/establecimientos', datos);
  return data.data;
};

export const actualizarEstablecimientoApi = async (id, datos) => {
  const { data } = await api.patch(`/api/establecimientos/${id}`, datos);
  return data.data;
};

export const desactivarEstablecimientoApi = async (id) => {
  const { data } = await api.delete(`/api/establecimientos/${id}`);
  return data.data;
};
