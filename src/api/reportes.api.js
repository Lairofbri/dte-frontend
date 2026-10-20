// src/api/reportes.api.js
// Cliente de la API de Reportes para la representación gráfica del DTE.
//
// No reutiliza `axios.js`: el refresh del DTE vive en una cookie httpOnly del
// host del DTE Service (path /api/auth). Acá solo viaja el Bearer en memoria,
// igual que en el POS (reportesClient.ts).

import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_REPORTES_URL = import.meta.env.VITE_REPORTES_API_URL || '';

const reportes = axios.create({
  baseURL: API_REPORTES_URL,
  withCredentials: false,
});

reportes.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** PDF fiscal A4 del DTE. El backend responde 409 si el estado no lo permite. */
export const obtenerPdfDteApi = async (codigoGeneracion) => {
  const { data } = await reportes.get(
    `/reportes/dte/documentos/${codigoGeneracion}/pdf`,
    { responseType: 'blob' }
  );
  return data;
};
