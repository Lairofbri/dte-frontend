// src/hooks/useAuth.js
// Lógica de autenticación reutilizable
//
// Fix CUBIC: guardar el access token en el store ANTES de llamar meApi()
// → el interceptor de axios necesita el token para enviar Authorization
// → si no está en el store, meApi() recibe 401 y entra en bucle

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { loginApi, logoutApi, meApi, refreshApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate  = useNavigate();
  const { setAuth, logout: limpiarStore, setLoading, setAccessToken } = useAuthStore();

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
   * Fix CUBIC: guardar el access token ANTES de llamar meApi()
   * para que el interceptor de axios pueda enviarlo en el header
   */
  const verificarSesion = async () => {
    setLoading(true);
    try {
      // 1. Obtener nuevo access token con la cookie httpOnly
      const resultado = await refreshApi();

      // 2. Guardar el token en el store ANTES de llamar meApi()
      //    El interceptor lo necesita para enviar Authorization: Bearer
      setAccessToken(resultado.access_token);

      // 3. Ahora sí llamar a meApi() — el interceptor ya tiene el token
      const usuario = await meApi();

      // 4. Actualizar el store completo con usuario
      setAuth({
        accessToken: resultado.access_token,
        usuario,
      });
    } catch (_) {
      // No hay sesión activa
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
