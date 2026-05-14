// src/pages/Auditoria.jsx
// Log inmutable de operaciones — solo lectura, solo admin

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listarAuditoriaApi } from '../api/auditoria.api';
import { BadgeGenerico }      from '../components/ui/Badge';
import Table                  from '../components/ui/Table';
import Pagination             from '../components/ui/Pagination';
import Spinner                from '../components/ui/Spinner';
import Button                 from '../components/ui/Button';
import { formatFechaHora }    from '../utils/formatters';
import { RefreshCw }          from 'lucide-react';

const EVENTOS = [
  { value: '',                    label: 'Todos los eventos'   },
  { value: 'DTE_EMITIDO',         label: 'DTE emitido'         },
  { value: 'DTE_ANULADO',         label: 'DTE anulado'         },
  { value: 'CONTINGENCIA',        label: 'Contingencia'        },
  { value: 'LOGIN',               label: 'Login'               },
  { value: 'LOGOUT',              label: 'Logout'              },
  { value: 'USUARIO_CREADO',      label: 'Usuario creado'      },
  { value: 'USUARIO_ACTUALIZADO', label: 'Usuario actualizado' },
  { value: 'CONFIGURACION',       label: 'Configuración'       },
];

const columnas = [
  {
    key:    'evento',
    header: 'Evento',
    render: (valor) => (
      <BadgeGenerico variant="blue" className="font-mono text-xs">{valor}</BadgeGenerico>
    ),
  },
  {
    key:    'descripcion',
    header: 'Descripción',
    render: (valor) => <span className="text-sm text-gray-700">{valor ?? '—'}</span>,
  },
  {
    key:    'usuario_email',
    header: 'Usuario',
    render: (valor) => <span className="text-xs text-gray-500">{valor ?? 'Sistema'}</span>,
  },
  {
    key:    'ip',
    header: 'IP',
    render: (valor) => <span className="text-xs font-mono text-gray-400">{valor ?? '—'}</span>,
  },
  {
    key:    'creado_en',
    header: 'Fecha',
    render: (valor) => <span className="text-xs text-gray-500">{formatFechaHora(valor)}</span>,
  },
];

const Auditoria = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [registros,  setRegistros]  = useState([]);
  const [paginacion, setPaginacion] = useState({ total: 0, pagina: 1, limite: 20 });
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState(null);
  const [contadorRecarga, setContadorRecarga] = useState(0);

  const filtros = {
    evento:      searchParams.get('evento')      || '',
    fecha_desde: searchParams.get('fecha_desde') || '',
    fecha_hasta: searchParams.get('fecha_hasta') || '',
    pagina:      Number(searchParams.get('pagina')) || 1,
    limite:      20,
  };

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = { pagina: filtros.pagina, limite: filtros.limite };
        if (filtros.evento)      params.evento      = filtros.evento;
        if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
        if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
        const datos = await listarAuditoriaApi(params);
        if (!cancelado) {
          setRegistros(datos?.registros ?? []);
          setPaginacion(datos?.paginacion ?? { total: 0, pagina: 1, limite: 20 });
        }
      } catch (_) {
        if (!cancelado) setError('No se pudo cargar el log de auditoría.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [searchParams, contadorRecarga]);

  const cambiarFiltro = useCallback((nombre, valor) => {
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      if (valor) n.set(nombre, valor); else n.delete(nombre);
      n.set('pagina', '1');
      return n;
    });
  }, [setSearchParams]);

  const cambiarPagina = useCallback((p) => {
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      n.set('pagina', String(p));
      return n;
    });
  }, [setSearchParams]);

  const recargar = useCallback(() => setContadorRecarga((p) => p + 1), []);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  if (error) return (
    <div className="card p-8 text-center">
      <p className="text-gray-500 mb-4" role="alert">{error}</p>
      <Button variant="secondary" onClick={recargar}>
        <RefreshCw className="w-4 h-4" aria-hidden="true" /> Reintentar
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">Log inmutable de operaciones del sistema</p>
        </div>
        <Button variant="secondary" onClick={recargar}>
          <RefreshCw className="w-4 h-4" aria-hidden="true" /> Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-body py-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label htmlFor="filtro-evento" className="label">Evento</label>
              <select id="filtro-evento" value={filtros.evento}
                onChange={(e) => cambiarFiltro('evento', e.target.value)}
                className="input min-w-[180px]">
                {EVENTOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filtro-desde" className="label">Desde</label>
              <input id="filtro-desde" type="date" value={filtros.fecha_desde}
                onChange={(e) => cambiarFiltro('fecha_desde', e.target.value)}
                className="input" />
            </div>
            <div>
              <label htmlFor="filtro-hasta" className="label">Hasta</label>
              <input id="filtro-hasta" type="date" value={filtros.fecha_hasta}
                onChange={(e) => cambiarFiltro('fecha_hasta', e.target.value)}
                className="input" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <Table
          columns={columnas}
          data={registros}
          emptyTitle="Sin registros"
          emptyDescription="No hay eventos de auditoría para los filtros aplicados."
          ariaLabel="Log de auditoría"
        />
        {paginacion.total > 0 && (
          <div className="px-4 border-t border-gray-50">
            <Pagination
              total={paginacion.total}
              pagina={paginacion.pagina}
              limite={paginacion.limite}
              onCambiar={cambiarPagina}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Auditoria;
