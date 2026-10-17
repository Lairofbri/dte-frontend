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
  tenantId:        null,
  establecimientoId: null,
  // Fase C3 — sucursal elegida por el administrador post-login (cards).
  // Los operadores emiten siempre con el establecimiento fijo de su JWT.
  establecimientoSeleccionado: null,
  isAuthenticated: false,
  isLoading:       true,

  // ─────────────────────────────────────────────
  // ACCIONES
  // ─────────────────────────────────────────────
  setAuth: ({ accessToken, usuario }) => set({
    accessToken,
    usuario,
    tenantId: usuario?.tenant_id || null,
    establecimientoId: usuario?.establecimiento_id || null,
    // Sesión nueva (login/restore): la selección se re-hace por el selector.
    establecimientoSeleccionado: null,
    isAuthenticated: true,
    isLoading:       false,
  }),

  /**
   * Guarda la sucursal elegida en el selector post-login (Fase C3).
   * Recibe el establecimiento completo de `GET /api/establecimientos` y
   * conserva solo lo que la sesión necesita mostrar.
   */
  setEstablecimientoSeleccionado: (establecimiento) => set({
    establecimientoSeleccionado: establecimiento
      ? {
          id:             establecimiento.id,
          nombre:         establecimiento.nombre,
          cod_estable_mh: establecimiento.cod_estable_mh ?? null,
        }
      : null,
  }),

  setAccessToken: (accessToken) => set({ accessToken }),

  logout: () => set({
    accessToken:     null,
    usuario:         null,
    tenantId:        null,
    establecimientoId: null,
    establecimientoSeleccionado: null,
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

// Multi-rol (2026-10-16): un usuario puede tener varios roles. `roles` es la
// lista; `rol` se conserva como principal (compat con sesiones previas).
// Helper puro (no selector) para no crear referencias nuevas en cada render.
export const obtenerRoles = (usuario) => {
  if (!usuario) return [];
  if (Array.isArray(usuario.roles) && usuario.roles.length > 0) return usuario.roles;
  return usuario.rol ? [usuario.rol] : [];
};

export const selectEsAdmin =
  (state) => obtenerRoles(state.usuario).includes('administrador');

export const selectEsPlataforma =
  (state) => obtenerRoles(state.usuario).includes('plataforma');

// Puede administrar el tenant: administrador o plataforma.
export const selectPuedeAdministrar =
  (state) => obtenerRoles(state.usuario).some((r) => r === 'administrador' || r === 'plataforma');

export const selectEstablecimientoId =
  (state) => state.establecimientoId;

export const selectEstablecimientoSeleccionado =
  (state) => state.establecimientoSeleccionado;

export const selectEstablecimientoSeleccionadoId =
  (state) => state.establecimientoSeleccionado?.id ?? null;

export const selectTenantId =
  (state) => state.tenantId;

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
