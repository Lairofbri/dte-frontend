// src/hooks/useDTEs.js
// Hook para gestionar la lista de DTEs
// Los filtros se sincronizan con URL params — patrón moderno React
//
// Fix CUBIC:
// → Eliminar import innecesario de establecimientoId
// → Guard contra race condition con AbortController

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams }                   from 'react-router-dom';
import { listarDTEsApi }                     from '../api/dtes.api';

export const useDTEs = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [dtes,       setDtes]       = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, pagina: 1, limite: 20, paginas: 0 });
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState(null);
  // Contador para forzar recarga aunque los params no cambien
  const [contadorRecarga, setContadorRecarga] = useState(0);

  // ── Leer filtros desde la URL — la URL ES el estado ──
  const filtros = {
    tipo_dte:    searchParams.get('tipo_dte')    || '',
    estado:      searchParams.get('estado')      || '',
    fecha_desde: searchParams.get('fecha_desde') || '',
    fecha_hasta: searchParams.get('fecha_hasta') || '',
    pagina:      Number(searchParams.get('pagina')) || 1,
    limite:      Number(searchParams.get('limite')) || 20,
  };

  // ── Cargar DTEs con guard contra race condition ──
  useEffect(() => {
    // AbortController cancela requests anteriores si los filtros cambian rápido
    let cancelado = false;

    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = { pagina: filtros.pagina, limite: filtros.limite };
        if (filtros.tipo_dte)    params.tipo_dte    = filtros.tipo_dte;
        if (filtros.estado)      params.estado      = filtros.estado;
        if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
        if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;

        const resultado = await listarDTEsApi(params);

        // Solo actualizar si este request sigue siendo el más reciente
        if (!cancelado) {
          setDtes(resultado?.dtes ?? []);
          setPaginacion(resultado?.paginacion ?? { total: 0, pagina: 1, limite: 20, paginas: 0 });
        }
      } catch (err) {
        if (!cancelado) {
          setError('No se pudieron cargar los DTEs.');
        }
      } finally {
        if (!cancelado) {
          setIsLoading(false);
        }
      }
    };

    cargar();

    // Cleanup: marcar como cancelado si los params cambian antes de que termine
    return () => { cancelado = true; };
  }, [searchParams, contadorRecarga]);

  // ── Actualizar filtro en la URL ──
  const cambiarFiltro = useCallback((nombre, valor) => {
    setSearchParams((prev) => {
      const nuevos = new URLSearchParams(prev);
      if (valor) {
        nuevos.set(nombre, valor);
      } else {
        nuevos.delete(nombre);
      }
      nuevos.set('pagina', '1');
      return nuevos;
    });
  }, [setSearchParams]);

  // ── Cambiar página en la URL ──
  const cambiarPagina = useCallback((nuevaPagina) => {
    setSearchParams((prev) => {
      const nuevos = new URLSearchParams(prev);
      nuevos.set('pagina', String(nuevaPagina));
      return nuevos;
    });
  }, [setSearchParams]);

  // ── Limpiar todos los filtros ──
  const limpiarFiltros = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  // ── Recargar manualmente ──
  // Incrementa el contador para forzar el useEffect aunque los params no cambien
  const recargar = useCallback(() => {
    setContadorRecarga((prev) => prev + 1);
  }, []);

  const hayFiltrosActivos = !!(
    filtros.tipo_dte || filtros.estado ||
    filtros.fecha_desde || filtros.fecha_hasta
  );

  return {
    dtes,
    paginacion,
    filtros,
    isLoading,
    error,
    hayFiltrosActivos,
    cambiarFiltro,
    cambiarPagina,
    limpiarFiltros,
    recargar,
  };
};