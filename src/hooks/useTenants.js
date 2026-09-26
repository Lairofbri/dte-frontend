// src/hooks/useTenants.js
// Carga las empresas públicas antes del login sin persistir información sensible.

import { useCallback, useEffect, useState } from 'react';
import { listarTenantsApi } from '../api/tenants.api';

export const useTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const datos = await listarTenantsApi();
        if (!cancelado) setTenants(Array.isArray(datos) ? datos : []);
      } catch {
        if (!cancelado) setError('No se pudieron cargar las empresas disponibles.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };

    cargar();
    return () => { cancelado = true; };
  }, [version]);

  const recargar = useCallback(() => setVersion((prev) => prev + 1), []);

  return { tenants, isLoading, error, recargar };
};
