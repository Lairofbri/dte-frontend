// src/api/contingencia.api.js
import api from './axios';

export const listarContingenciaApi = async () => {
  const { data } = await api.get('/api/contingencia/pendientes');
  return data.data;
};

export const notificarContingenciaApi = async (datos) => {
  const { data } = await api.post('/api/contingencia/notificar', datos);
  return data.data;
};

export const consultarLoteApi = async (codigoLote) => {
  const { data } = await api.get(`/api/contingencia/lote/${codigoLote}`);
  return data.data;
};
