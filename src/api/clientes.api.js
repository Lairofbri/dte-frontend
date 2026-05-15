// src/api/clientes.api.js
import api from './axios';

export const buscarClientesApi = async (params = {}) => {
  const { data } = await api.get('/api/clientes', { params });
  return data.data;
};

export const obtenerClienteApi = async (id) => {
  const { data } = await api.get(`/api/clientes/${id}`);
  return data.data;
};

export const crearClienteApi = async (datos) => {
  const { data } = await api.post('/api/clientes', datos);
  return data.data;
};

export const actualizarClienteApi = async (id, datos) => {
  const { data } = await api.put(`/api/clientes/${id}`, datos);
  return data.data;
};

export const eliminarClienteApi = async (id) => {
  const { data } = await api.delete(`/api/clientes/${id}`);
  return data.data;
};
