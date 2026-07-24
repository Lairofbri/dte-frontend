// src/hooks/useDashboard.js
// Orquesta todas las llamadas del dashboard
// Separa la lógica de datos de la UI

import { useState, useEffect, useCallback } from 'react';
import { obtenerResumenApi } from '../api/auditoria.api';
import { listarDTEsApi }     from '../api/dtes.api';

export const useDashboard = () => {
  const [resumen,           setResumen]           = useState(null);
  const [dtesContingencia,  setDtesContingencia]  = useState([]);
  const [dtesRechazados,    setDtesRechazados]    = useState([]);
  const [isLoading,         setIsLoading]         = useState(true);
  const [error,             setError]             = useState(null);
  const [recargaKey,        setRecargaKey]        = useState(0);

  const recargar = useCallback(() => setRecargaKey(k => k + 1), []);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [resumenData, contingenciaData, rechazadosData] = await Promise.all([
          obtenerResumenApi(),
          listarDTEsApi({ estado: 'contingencia', limite: 5 }),
          listarDTEsApi({ estado: 'rechazado',    limite: 5 }),
        ]);

        if (!cancelado) {
          setResumen(resumenData);
          setDtesContingencia(contingenciaData?.dtes ?? []);
          setDtesRechazados(rechazadosData?.dtes     ?? []);
        }
      } catch {
        if (!cancelado) setError('No se pudieron cargar los datos del dashboard.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [recargaKey]);

  return {
    resumen,
    dtesContingencia,
    dtesRechazados,
    isLoading,
    error,
    recargar,
  };
};
