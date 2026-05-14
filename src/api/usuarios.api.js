// src/api/usuarios.api.js
import api from './axios';

export const listarUsuariosApi = async () => {
  const { data } = await api.get('/api/usuarios');
  return data.data;
};

export const crearUsuarioApi = async (datos) => {
  const { data } = await api.post('/api/usuarios', datos);
  return data.data;
};

export const actualizarUsuarioApi = async (id, datos) => {
  const { data } = await api.patch(`/api/usuarios/${id}`, datos);
  return data.data;
};

export const desactivarUsuarioApi = async (id) => {
  const { data } = await api.delete(`/api/usuarios/${id}`);
  return data.data;
};
