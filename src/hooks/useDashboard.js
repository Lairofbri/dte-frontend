// src/hooks/useDashboard.js
// Orquesta todas las llamadas del dashboard
// Separa la lógica de datos de la UI

import { useState, useEffect } from 'react';
import { obtenerResumenApi } from '../api/auditoria.api';
import { listarDTEsApi }     from '../api/dtes.api';

export const useDashboard = () => {
  const [resumen,           setResumen]           = useState(null);
  const [dtesContingencia,  setDtesContingencia]  = useState([]);
  const [dtesRechazados,    setDtesRechazados]    = useState([]);
  const [isLoading,         setIsLoading]         = useState(true);
  const [error,             setError]             = useState(null);

  const cargarDatos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Cargar todas las métricas en paralelo
      const [resumenData, contingenciaData, rechazadosData] = await Promise.all([
        obtenerResumenApi(),
        listarDTEsApi({ estado: 'contingencia', limite: 5 }),
        listarDTEsApi({ estado: 'rechazado',    limite: 5 }),
      ]);

      setResumen(resumenData);
      setDtesContingencia(contingenciaData?.dtes ?? []);
      setDtesRechazados(rechazadosData?.dtes     ?? []);
    } catch (err) {
      setError('No se pudieron cargar los datos del dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  return {
    resumen,
    dtesContingencia,
    dtesRechazados,
    isLoading,
    error,
    recargar: cargarDatos,
  };
};
