// src/components/dtes/FiltrosDTE.jsx
// Formulario de filtros para la lista de DTEs
// Los filtros se sincronizan con la URL — no necesita estado local

import { Filter, X } from 'lucide-react';

const TIPOS_DTE = [
  { value: '',   label: 'Todos los tipos' },
  { value: '01', label: 'Factura (FCF)' },
  { value: '03', label: 'Crédito Fiscal (CCF)' },
  { value: '05', label: 'Nota de Crédito' },
  { value: '06', label: 'Nota de Débito' },
  { value: '14', label: 'Sujeto Excluido (FSE)' },
];

const ESTADOS = [
  { value: '',             label: 'Todos los estados' },
  { value: 'aceptado',     label: 'Aceptado' },
  { value: 'rechazado',    label: 'Rechazado' },
  { value: 'contingencia', label: 'Contingencia' },
  { value: 'generado',     label: 'Generado' },
  { value: 'anulado',      label: 'Anulado' },
];

const FiltrosDTE = ({ filtros, onChange, onLimpiar, hayFiltrosActivos }) => (
  <div className="card mb-4">
    <div className="card-body py-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Icono de filtros */}
        <div className="flex items-center gap-1.5 text-gray-500 shrink-0 pt-5">
          <Filter className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">Filtros</span>
        </div>

        {/* Tipo de DTE */}
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="filtro-tipo" className="label">Tipo</label>
          <select
            id="filtro-tipo"
            value={filtros.tipo_dte}
            onChange={(e) => onChange('tipo_dte', e.target.value)}
            className="input"
          >
            {TIPOS_DTE.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="filtro-estado" className="label">Estado</label>
          <select
            id="filtro-estado"
            value={filtros.estado}
            onChange={(e) => onChange('estado', e.target.value)}
            className="input"
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>

        {/* Fecha desde */}
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="filtro-desde" className="label">Desde</label>
          <input
            id="filtro-desde"
            type="date"
            value={filtros.fecha_desde}
            onChange={(e) => onChange('fecha_desde', e.target.value)}
            className="input"
          />
        </div>

        {/* Fecha hasta */}
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="filtro-hasta" className="label">Hasta</label>
          <input
            id="filtro-hasta"
            type="date"
            value={filtros.fecha_hasta}
            onChange={(e) => onChange('fecha_hasta', e.target.value)}
            className="input"
          />
        </div>

        {/* Botón limpiar filtros */}
        {hayFiltrosActivos && (
          <button
            onClick={onLimpiar}
            className="btn-ghost btn-sm flex items-center gap-1.5 shrink-0 pt-5"
            aria-label="Limpiar todos los filtros"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            Limpiar
          </button>
        )}
      </div>
    </div>
  </div>
);

export default FiltrosDTE;
