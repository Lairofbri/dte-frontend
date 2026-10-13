// src/api/productos.api.js
// Capa de datos del módulo de productos — envelope data.data como el resto del repo

import api from './axios';

export const listarProductosApi = async (params = {}) => {
  const { data } = await api.get('/api/productos', { params });
  return data.data;
};

export const obtenerProductoApi = async (id) => {
  const { data } = await api.get(`/api/productos/${id}`);
  return data.data;
};

export const crearProductoApi = async (datos) => {
  const { data } = await api.post('/api/productos', datos);
  return data.data;
};

export const actualizarProductoApi = async (id, datos) => {
  const { data } = await api.put(`/api/productos/${id}`, datos);
  return data.data;
};

export const eliminarProductoApi = async (id) => {
  const { data } = await api.delete(`/api/productos/${id}`);
  return data.data;
};