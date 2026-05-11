// src/api/axios.js
// Instancia central de Axios para comunicación con el DTE Service
//
// SEGURIDAD:
// → Access token en memoria (Zustand) — nunca localStorage
// → Refresh token en httpOnly cookie — el navegador lo envía automáticamente
// → Si recibe 401 → intenta refresh automático
// → Si refresh falla → logout y redirige al login
// → Cola de requests pendientes durante el refresh

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ─────────────────────────────────────────────
// Instancia base
// ─────────────────────────────────────────────
const api = axios.create({
  baseURL:         API_URL,
  withCredentials: true, // necesario para enviar la httpOnly cookie del refresh token
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────────
// Variables de control del refresh
// ─────────────────────────────────────────────
let estaRefrescando = false;
let colaEspera      = [];

const procesarCola = (error, token = null) => {
  colaEspera.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  colaEspera = [];
};

// ─────────────────────────────────────────────
// Interceptor de REQUEST
// Agrega el Authorization: Bearer antes de cada request
// ─────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Obtener el access token del store de Zustand
    // Importación dinámica para evitar dependencia circular
    const { useAuthStore } = require('../store/auth.store');
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// Interceptor de RESPONSE
// Si recibe 401 → intenta refresh automático
// ─────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestOriginal = error.config;

    // Solo intentar refresh en errores 401 que no sean del propio refresh
    if (
      error.response?.status === 401 &&
      !requestOriginal._reintentado &&
      !requestOriginal.url?.includes('/api/auth/refresh') &&
      !requestOriginal.url?.includes('/api/auth/login')
    ) {
      if (estaRefrescando) {
        // Hay un refresh en curso — encolar este request
        return new Promise((resolve, reject) => {
          colaEspera.push({ resolve, reject });
        }).then((token) => {
          requestOriginal.headers.Authorization = `Bearer ${token}`;
          return api(requestOriginal);
        });
      }

      requestOriginal._reintentado = true;
      estaRefrescando = true;

      try {
        // Intentar renovar el access token
        // La cookie httpOnly se envía automáticamente
        const respuesta = await api.post('/api/auth/refresh');
        const nuevoToken = respuesta.data.data.access_token;

        // Actualizar el store con el nuevo token
        const { useAuthStore } = require('../store/auth.store');
        useAuthStore.getState().setAccessToken(nuevoToken);

        // Procesar la cola de requests pendientes
        procesarCola(null, nuevoToken);

        // Reintentar el request original con el nuevo token
        requestOriginal.headers.Authorization = `Bearer ${nuevoToken}`;
        return api(requestOriginal);

      } catch (errorRefresh) {
        // El refresh falló — logout y redirigir al login
        procesarCola(errorRefresh, null);

        const { useAuthStore } = require('../store/auth.store');
        useAuthStore.getState().logout();

        window.location.href = '/login';
        return Promise.reject(errorRefresh);

      } finally {
        estaRefrescando = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
