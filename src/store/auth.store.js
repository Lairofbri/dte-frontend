// src/store/auth.store.js
// Estado global de autenticación con Zustand
//
// SEGURIDAD CRÍTICA:
// → Access token en memoria — NUNCA en localStorage ni sessionStorage
// → Si el usuario cierra el tab el token desaparece
// → El refresh token está en httpOnly cookie — el store no lo ve
// → El store solo guarda: accessToken, usuario, isAuthenticated

import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  // ─────────────────────────────────────────────
  // ESTADO
  // ─────────────────────────────────────────────
  accessToken:     null,   // en memoria — nunca en localStorage
  usuario:         null,   // { id, nombre, email, rol, establecimiento_id, establecimiento }
  isAuthenticated: false,
  isLoading:       true,   // true mientras verifica si hay sesión activa

  // ─────────────────────────────────────────────
  // ACCIONES
  // ─────────────────────────────────────────────

  /**
   * Guardar datos después del login exitoso
   * Llamado desde la página de Login
   */
  setAuth: ({ accessToken, usuario }) => set({
    accessToken,
    usuario,
    isAuthenticated: true,
    isLoading:       false,
  }),

  /**
   * Actualizar solo el access token (después del refresh)
   * El usuario no cambia
   */
  setAccessToken: (accessToken) => set({ accessToken }),

  /**
   * Limpiar estado al hacer logout
   * El access token desaparece de memoria
   * La cookie httpOnly la limpia el backend
   */
  logout: () => set({
    accessToken:     null,
    usuario:         null,
    isAuthenticated: false,
    isLoading:       false,
  }),

  /**
   * Marcar que terminó de verificar la sesión
   */
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Getters convenientes
   */
  esAdmin: () => get().usuario?.rol === 'administrador',
  establecimientoId: () => get().usuario?.establecimiento_id,
  nombreUsuario: () => get().usuario?.nombre,
  nombreEstablecimiento: () => get().usuario?.establecimiento?.nombre,
}));
