// src/hooks/useDTEDetalle.js
// Hook para obtener el detalle de un DTE y manejarlo
// Separa la lógica de datos de la UI

import { useState, useEffect, useCallback } from 'react';
import { useNavigate }                       from 'react-router-dom';
import { toast }                             from 'react-hot-toast';
import { obtenerDTEApi, anularDTEApi }       from '../api/dtes.api';

export const useDTEDetalle = (codigoGeneracion) => {
  const navigate = useNavigate();

  const [dte,      setDte]      = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,    setError]    = useState(null);
  const [anulando, setAnulando] = useState(false);
  const [contadorRecarga, setContadorRecarga] = useState(0);

  // ── Cargar detalle del DTE ──
  useEffect(() => {
    if (!codigoGeneracion) return;
    let cancelado = false;

    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const datos = await obtenerDTEApi(codigoGeneracion);
        if (!cancelado) setDte(datos);
      } catch (err) {
        if (!cancelado) {
          const mensaje = err.response?.status === 404
            ? 'DTE no encontrado.'
            : 'No se pudo cargar el DTE.';
          setError(mensaje);
        }
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };

    cargar();
    return () => { cancelado = true; };
  }, [codigoGeneracion, contadorRecarga]);

  const recargar = useCallback(() => {
    setContadorRecarga((prev) => prev + 1);
  }, []);

  // ── Anular DTE ──
  const anular = useCallback(async ({ passwordPri, motivoAnulacion }) => {
    if (!dte) return;
    setAnulando(true);
    try {
      await anularDTEApi({
        codigo_generacion: dte.codigo_generacion,
        password_pri:      passwordPri,
        motivo_anulacion:  motivoAnulacion,
      });
      toast.success('DTE anulado correctamente.');
      navigate('/dtes');
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || 'No se pudo anular el DTE.';
      toast.error(mensaje);
    } finally {
      setAnulando(false);
    }
  }, [dte, navigate]);

  return {
    dte,
    isLoading,
    error,
    anulando,
    recargar,
    anular,
  };
};
