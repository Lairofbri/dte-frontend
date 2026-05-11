// src/api/auth.api.js
// Endpoints del módulo de autenticación
// Principio S: solo habla con el backend, no maneja estado

import api from './axios';

/**
 * Login con email + password
 * El refresh token llega en httpOnly cookie automáticamente
 * Solo necesitamos guardar el access_token del body
 */
export const loginApi = async ({ email, password }) => {
  const { data } = await api.post('/api/auth/login', { email, password });
  return data.data; // { access_token, token_type, expira_en, usuario }
};

/**
 * Renovar access token
 * La cookie httpOnly se envía automáticamente
 */
export const refreshApi = async () => {
  const { data } = await api.post('/api/auth/refresh');
  return data.data; // { access_token, token_type, expira_en }
};

/**
 * Logout — revoca el refresh token y limpia la cookie
 */
export const logoutApi = async () => {
  await api.post('/api/auth/logout');
};

/**
 * Obtener datos del usuario actual
 */
export const meApi = async () => {
  const { data } = await api.get('/api/auth/me');
  return data.data;
};
