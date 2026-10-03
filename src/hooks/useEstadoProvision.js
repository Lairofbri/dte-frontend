// src/hooks/useEstadoProvision.js
// Hook de estado de provisión de empresas (Fase 2).
// Plataforma: lista global + alta de empresas. Administrador: solo su tenant.

import { useState, useEffect, useCallback } from 'react';
import { toast }                             from 'react-hot-toast';
import { obtenerEstadoProvisionApi, crearTenantPlataformaApi } from '../api/provisioning.api';

export const useEstadoProvision = ({ enabled = true } = {}) => {
  const [tenants,           setTenants]           = useState([]);
  const [isLoading,         setIsLoading]         = useState(true);
  const [error,             setError]             = useState(null);
  const [contadorRecarga,   setContadorRecarga]   = useState(0);
  const [creando,           setCreando]           = useState(false);

  useEffect(() => {
    let cancelado = false;

    if (!enabled) return () => { cancelado = true; };

    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const datos = await obtenerEstadoProvisionApi();
        if (!cancelado) setTenants(datos ?? []);
      } catch {
        if (!cancelado) setError('No se pudo cargar el estado de provisión.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };

    cargar();
    return () => { cancelado = true; };
  }, [contadorRecarga, enabled]);

  const recargar = useCallback(() => setContadorRecarga((p) => p + 1), []);

  // Alta de empresa desde DTE (rol plataforma). Genera tenant_id y
  // operation_id (UUID v4) — misma convención que el POS.
  const crearEmpresa = useCallback(async ({ nombre, nit, nrc, email }) => {
    setCreando(true);
    try {
      const tenant = await crearTenantPlataformaApi({
        tenant_id:   crypto.randomUUID(),
        operation_id: crypto.randomUUID(),
        nombre,
        nit,
        nrc: nrc || null,
        email: email || null,
      });
      toast.success('Empresa creada. El POS recibirá el evento de provisión.');
      recargar();
      return tenant;
    } finally {
      setCreando(false);
    }
  }, [recargar]);

  return {
    tenants: enabled ? tenants : [],
    isLoading: enabled && isLoading,
    error: enabled ? error : null,
    creando,
    recargar,
    crearEmpresa,
  };
};