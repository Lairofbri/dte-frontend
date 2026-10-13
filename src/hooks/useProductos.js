// src/hooks/useProductos.js
// Datos del módulo de productos: búsqueda con debounce, filtros y paginación.
// Patrón del repo (sin React Query): useState + useEffect, guard `cancelado`,
// `contadorRecarga` + `recargar` para forzar refetch tras crear/editar/eliminar.

import { useState, useEffect, useCallback } from 'react';
import { listarProductosApi } from '../api/productos.api';

export const useProductos = ({ limite = 10 } = {}) => {
  const [productos,        setProductos]        = useState([]);
  const [paginacion,       setPaginacion]       = useState({ total: 0, pagina: 1, paginas: 0 });
  const [isLoading,        setIsLoading]        = useState(true);
  const [error,            setError]            = useState(null);
  const [busqueda,         setBusqueda]         = useState('');
  const [filtroTipoItem,   setFiltroTipoItem]   = useState('');
  const [filtroTipoVenta,  setFiltroTipoVenta]  = useState('');
  const [pagina,           setPagina]           = useState(1);
  const [contadorRecarga,  setContadorRecarga]  = useState(0);

  const recargar = useCallback(() => setContadorRecarga((p) => p + 1), []);
  const irPagina = useCallback((p) => setPagina(p), []);

  useEffect(() => {
    let cancelado = false;
    // Debounce de búsqueda para evitar llamadas en cada tecla
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = { pagina, limite };
        if (busqueda.trim()) params.q = busqueda.trim();
        if (filtroTipoItem)  params.tipo_item = filtroTipoItem;
        if (filtroTipoVenta) params.tipo_venta = filtroTipoVenta;
        const datos = await listarProductosApi(params);
        if (!cancelado) {
          setProductos(datos?.productos ?? []);
          setPaginacion(datos?.paginacion ?? { total: 0, pagina, paginas: 0 });
        }
      } catch {
        if (!cancelado) setError('No se pudieron cargar los productos.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    }, busqueda ? 350 : 0);

    return () => { cancelado = true; clearTimeout(timer); };
  }, [busqueda, filtroTipoItem, filtroTipoVenta, pagina, contadorRecarga, limite]);

  return {
    productos, paginacion, isLoading, error,
    busqueda, setBusqueda,
    filtroTipoItem, setFiltroTipoItem,
    filtroTipoVenta, setFiltroTipoVenta,
    pagina, irPagina,
    recargar,
  };
};