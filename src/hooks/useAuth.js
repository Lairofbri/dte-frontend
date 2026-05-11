// src/hooks/useAuth.js
// Lógica de autenticación reutilizable
// Orquesta: API → Store → UI

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { loginApi, logoutApi, meApi, refreshApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate  = useNavigate();
  const { setAuth, logout: limpiarStore, setLoading } = useAuthStore();

  /**
   * Login con email + password
   * Guarda el access token en memoria (Zustand)
   * El refresh token llega en httpOnly cookie automáticamente
   */
  const login = async ({ email, password }) => {
    setIsLoading(true);
    try {
      const resultado = await loginApi({ email, password });
      setAuth({
        accessToken: resultado.access_token,
        usuario:     resultado.usuario,
      });
      navigate('/dashboard');
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || 'Error al iniciar sesión.';
      toast.error(mensaje);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout — limpia el store y revoca el refresh token
   */
  const logout = async () => {
    try {
      await logoutApi();
    } catch (_) {
      // Si falla el API igual limpiamos el store local
    } finally {
      limpiarStore();
      navigate('/login');
    }
  };

  /**
   * Verificar si hay sesión activa al cargar la app
   * Intenta renovar el access token usando la cookie httpOnly
   * Si falla → no hay sesión activa
   */
  const verificarSesion = async () => {
    setLoading(true);
    try {
      const resultado = await refreshApi();
      const usuario   = await meApi();
      setAuth({
        accessToken: resultado.access_token,
        usuario,
      });
    } catch (_) {
      // No hay sesión activa — usuario debe hacer login
      limpiarStore();
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    logout,
    verificarSesion,
    isLoading,
  };
};
