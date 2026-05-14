// src/hooks/useUsuarios.js
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  listarUsuariosApi, crearUsuarioApi,
  actualizarUsuarioApi, desactivarUsuarioApi,
} from '../api/usuarios.api';

export const useUsuarios = () => {
  const [usuarios,        setUsuarios]        = useState([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState(null);
  const [contadorRecarga, setContadorRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const datos = await listarUsuariosApi();
        if (!cancelado) setUsuarios(datos?.usuarios ?? datos ?? []);
      } catch (_) {
        if (!cancelado) setError('No se pudieron cargar los usuarios.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [contadorRecarga]);

  const recargar = useCallback(() => setContadorRecarga((p) => p + 1), []);

  const crear = useCallback(async (datos) => {
    const nuevo = await crearUsuarioApi(datos);
    toast.success('Usuario creado correctamente.');
    recargar();
    return nuevo;
  }, [recargar]);

  const actualizar = useCallback(async (id, datos) => {
    const actualizado = await actualizarUsuarioApi(id, datos);
    toast.success('Usuario actualizado correctamente.');
    recargar();
    return actualizado;
  }, [recargar]);

  const desactivar = useCallback(async (id) => {
    await desactivarUsuarioApi(id);
    toast.success('Usuario desactivado correctamente.');
    recargar();
  }, [recargar]);

  return { usuarios, isLoading, error, recargar, crear, actualizar, desactivar };
};
