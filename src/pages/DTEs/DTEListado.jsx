// src/pages/DTEs/DTEListado.jsx
// Lista de DTEs con filtros sincronizados en URL y paginación
// Patrón: URL params como estado — permite compartir y navegar con historial

import { useNavigate }          from 'react-router-dom';
import { Plus, RefreshCw }      from 'lucide-react';
import { useDTEs }              from '../../hooks/useDTEs';
import FiltrosDTE               from '../../components/dtes/FiltrosDTE';
import Badge                    from '../../components/ui/Badge';
import Table                    from '../../components/ui/Table';
import Pagination               from '../../components/ui/Pagination';
import Spinner                  from '../../components/ui/Spinner';
import Button                   from '../../components/ui/Button';
import {
  formatMonto,
  formatFecha,
  acortarCodigo,
  nombreTipoDTE,
} from '../../utils/formatters';

// ─────────────────────────────────────────────
// Columnas de la tabla
// ─────────────────────────────────────────────
const columnas = [
  {
    key:    'numero_control',
    header: 'N° Control',
    render: (valor) => (
      <span className="mono text-xs text-gray-600">
        {valor ?? '—'}
      </span>
    ),
  },
  {
    key:    'tipo_dte',
    header: 'Tipo',
    render: (valor) => (
      <span className="text-sm text-gray-700">
        {nombreTipoDTE(valor)}
      </span>
    ),
  },
  {
    key:    'receptor_nombre',
    header: 'Receptor',
    render: (valor) => (
      <span className="text-sm text-gray-700 max-w-[180px] truncate block">
        {valor ?? 'Consumidor final'}
      </span>
    ),
  },
  {
    key:    'fecha_emision',
    header: 'Fecha',
    render: (valor) => (
      <span className="text-sm text-gray-600">
        {formatFecha(valor)}
      </span>
    ),
  },
  {
    key:    'total',
    header: 'Total',
    render: (valor) => (
      <span className="mono text-sm font-medium text-gray-800">
        {formatMonto(valor)}
      </span>
    ),
    headerClassName: 'text-right',
    className:       'text-right',
  },
  {
    key:    'estado',
    header: 'Estado',
    render: (valor) => <Badge estado={valor} />,
  },
];

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const DTEListado = () => {
  const navigate = useNavigate();
  const {
    dtes, paginacion, filtros, isLoading, error,
    hayFiltrosActivos, cambiarFiltro, cambiarPagina,
    limpiarFiltros, recargar,
  } = useDTEs();

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 mb-4">{error}</p>
        <Button variant="secondary" onClick={recargar}>
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header de página */}
      <div className="page-header">
        <div>
          <h1 className="page-title">DTEs</h1>
          <p className="page-subtitle">
            {paginacion.total > 0
              ? `${paginacion.total} documento${paginacion.total !== 1 ? 's' : ''} encontrado${paginacion.total !== 1 ? 's' : ''}`
              : 'Sin documentos'
            }
          </p>
        </div>
        <Button onClick={() => navigate('/dtes/emitir')}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          Emitir DTE
        </Button>
      </div>

      {/* Filtros — sincronizados con URL */}
      <FiltrosDTE
        filtros={filtros}
        onChange={cambiarFiltro}
        onLimpiar={limpiarFiltros}
        hayFiltrosActivos={hayFiltrosActivos}
      />

      {/* Tabla */}
      {isLoading ? (
        <div className="card p-12 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="card">
          <Table
            columns={columnas}
            data={dtes}
            onRowClick={(dte) => navigate(`/dtes/${dte.codigo_generacion}`)}
            emptyTitle="Sin DTEs"
            emptyDescription={
              hayFiltrosActivos
                ? 'No hay DTEs que coincidan con los filtros aplicados.'
                : 'Aún no has emitido ningún DTE. ¡Emite el primero!'
            }
            ariaLabel="Lista de Documentos Tributarios Electrónicos"
          />

          {/* Paginación */}
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
      )}
    </div>
  );
};

export default DTEListado;
