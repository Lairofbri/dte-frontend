// src/hooks/useAuth.js
// Lógica de autenticación reutilizable

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { loginApi, logoutApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate  = useNavigate();
  const { setAuth, logout: limpiarStore } = useAuthStore();

  /**
   * Login con email + password
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
      throw err;
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

  return {
    login,
    logout,
    isLoading,
  };
};
