// src/hooks/useEstablecimientos.js
// Hook para gestionar establecimientos — CRUD completo

import { useState, useEffect, useCallback } from 'react';
import { toast }                             from 'react-hot-toast';
import {
  listarEstablecimientosApi,
  crearEstablecimientoApi,
  actualizarEstablecimientoApi,
  desactivarEstablecimientoApi,
} from '../api/establecimientos.api';

export const useEstablecimientos = () => {
  const [establecimientos, setEstablecimientos] = useState([]);
  const [isLoading,        setIsLoading]        = useState(true);
  const [error,            setError]            = useState(null);
  const [contadorRecarga,  setContadorRecarga]  = useState(0);

  // ── Cargar lista ──
  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const datos = await listarEstablecimientosApi();
        if (!cancelado) setEstablecimientos(datos?.establecimientos ?? datos ?? []);
      } catch (err) {
        if (!cancelado) setError('No se pudieron cargar los establecimientos.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };

    cargar();
    return () => { cancelado = true; };
  }, [contadorRecarga]);

  const recargar = useCallback(() => setContadorRecarga((p) => p + 1), []);

  // ── Crear ──
  const crear = useCallback(async (datos) => {
    const nuevo = await crearEstablecimientoApi(datos);
    toast.success('Establecimiento creado correctamente.');
    recargar();
    return nuevo;
  }, [recargar]);

  // ── Actualizar ──
  const actualizar = useCallback(async (id, datos) => {
    const actualizado = await actualizarEstablecimientoApi(id, datos);
    toast.success('Establecimiento actualizado correctamente.');
    recargar();
    return actualizado;
  }, [recargar]);

  // ── Desactivar ──
  const desactivar = useCallback(async (id) => {
    await desactivarEstablecimientoApi(id);
    toast.success('Establecimiento desactivado correctamente.');
    recargar();
  }, [recargar]);

  return {
    establecimientos,
    isLoading,
    error,
    recargar,
    crear,
    actualizar,
    desactivar,
  };
};
