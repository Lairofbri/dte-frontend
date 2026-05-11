// src/store/auth.store.js
// Estado global de autenticación con Zustand
//
// SEGURIDAD:
// → Access token en memoria — NUNCA en localStorage
// → Refresh token en httpOnly cookie — el store no lo ve
//
// Fix CUBIC: selectores definidos FUERA del store
// → los getters dentro del store no disparan re-renders en React
// → los selectores externos sí lo hacen correctamente

import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  // ─────────────────────────────────────────────
  // ESTADO
  // ─────────────────────────────────────────────
  accessToken:     null,
  usuario:         null,
  isAuthenticated: false,
  isLoading:       true,

  // ─────────────────────────────────────────────
  // ACCIONES
  // ─────────────────────────────────────────────
  setAuth: ({ accessToken, usuario }) => set({
    accessToken,
    usuario,
    isAuthenticated: true,
    isLoading:       false,
  }),

  setAccessToken: (accessToken) => set({ accessToken }),

  logout: () => set({
    accessToken:     null,
    usuario:         null,
    isAuthenticated: false,
    isLoading:       false,
  }),

  setLoading: (isLoading) => set({ isLoading }),
}));

// ─────────────────────────────────────────────
// SELECTORES — definidos fuera del store
// Fix CUBIC: los selectores externos SÍ disparan re-renders
// Uso: const esAdmin = useAuthStore(selectEsAdmin);
// ─────────────────────────────────────────────
export const selectEsAdmin =
  (state) => state.usuario?.rol === 'administrador';

export const selectEstablecimientoId =
  (state) => state.usuario?.establecimiento_id;

export const selectNombreUsuario =
  (state) => state.usuario?.nombre;

export const selectNombreEstablecimiento =
  (state) => state.usuario?.establecimiento?.nombre;

export const selectUsuario =
  (state) => state.usuario;

export const selectIsAuthenticated =
  (state) => state.isAuthenticated;

export const selectIsLoading =
  (state) => state.isLoading;

export const selectAccessToken =
  (state) => state.accessToken;
