// src/hooks/useDTEs.js
// Hook para gestionar la lista de DTEs
// Los filtros se sincronizan con URL params — patrón moderno React
// Permite compartir URLs con filtros y restaurar estado con el botón atrás

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams }                   from 'react-router-dom';
import { listarDTEsApi }                     from '../api/dtes.api';
import { useAuthStore, selectEstablecimientoId } from '../store/auth.store';

export const useDTEs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const establecimientoId = useAuthStore(selectEstablecimientoId);

  const [dtes,      setDtes]      = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, pagina: 1, limite: 20, paginas: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  // ── Leer filtros desde la URL — la URL ES el estado ──
  const filtros = {
    tipo_dte:    searchParams.get('tipo_dte')    || '',
    estado:      searchParams.get('estado')      || '',
    fecha_desde: searchParams.get('fecha_desde') || '',
    fecha_hasta: searchParams.get('fecha_hasta') || '',
    pagina:      Number(searchParams.get('pagina')) || 1,
    limite:      Number(searchParams.get('limite')) || 20,
  };

  // ── Cargar DTEs cuando cambian los params de URL ──
  const cargarDTEs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Construir parámetros — solo los que tienen valor
      const params = { pagina: filtros.pagina, limite: filtros.limite };
      if (filtros.tipo_dte)    params.tipo_dte    = filtros.tipo_dte;
      if (filtros.estado)      params.estado      = filtros.estado;
      if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
      if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;

      const resultado = await listarDTEsApi(params);
      setDtes(resultado?.dtes ?? []);
      setPaginacion(resultado?.paginacion ?? { total: 0, pagina: 1, limite: 20, paginas: 0 });
    } catch (err) {
      setError('No se pudieron cargar los DTEs.');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]); // recarga cuando cambia la URL

  useEffect(() => {
    cargarDTEs();
  }, [cargarDTEs]);

  // ── Actualizar filtro en la URL ──
  const cambiarFiltro = useCallback((nombre, valor) => {
    setSearchParams((prev) => {
      const nuevos = new URLSearchParams(prev);
      if (valor) {
        nuevos.set(nombre, valor);
      } else {
        nuevos.delete(nombre);
      }
      // Al cambiar filtro volver a página 1
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
    recargar: cargarDTEs,
  };
};
