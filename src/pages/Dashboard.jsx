// src/pages/Dashboard.jsx
// Dashboard principal del DTE Service
// Muestra métricas, alertas y acceso rápido

import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, AlertTriangle,
  XCircle, TrendingUp, RefreshCw, Plus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useDashboard }    from '../hooks/useDashboard';
import { useAuthStore, selectNombreUsuario } from '../store/auth.store';
import Badge               from '../components/ui/Badge';
import Spinner             from '../components/ui/Spinner';
import Button              from '../components/ui/Button';
import { formatMonto, formatFechaHora, nombreTipoDTE } from '../utils/formatters';

// ─────────────────────────────────────────────
// SUBCOMPONENTES
// ─────────────────────────────────────────────

const MetricCard = ({ titulo, valor, icono: Icono, color, descripcion }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{titulo}</p>
        <p className="text-2xl font-bold font-sans text-gray-900 mt-1">
          {valor ?? '—'}
        </p>
        {descripcion && (
          <p className="text-xs text-gray-400 mt-1">{descripcion}</p>
        )}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icono className="w-5 h-5" aria-hidden="true" />
      </div>
    </div>
  </div>
);

const AlertaBanner = ({ tipo, cantidad, onVerTodos }) => {
  if (cantidad === 0) return null;

  const config = {
    contingencia: {
      color:   'bg-yellow-50 border-yellow-200 text-yellow-800',
      icono:   AlertTriangle,
      mensaje: `${cantidad} DTE${cantidad > 1 ? 's' : ''} en contingencia pendiente${cantidad > 1 ? 's' : ''} de enviar`,
    },
    rechazado: {
      color:   'bg-red-50 border-red-200 text-red-800',
      icono:   XCircle,
      mensaje: `${cantidad} DTE${cantidad > 1 ? 's' : ''} rechazado${cantidad > 1 ? 's' : ''} requieren atención`,
    },
  };

  const { color, icono: Icono, mensaje } = config[tipo] ?? config.contingencia;

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${color}`}>
      <div className="flex items-center gap-3">
        <Icono className="w-5 h-5 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">{mensaje}</p>
      </div>
      <button
        onClick={onVerTodos}
        className="text-sm font-medium underline underline-offset-2 hover:no-underline transition-all shrink-0 ml-4"
      >
        Ver todos
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const Dashboard = () => {
  const navigate     = useNavigate();
  const nombreUsuario = useAuthStore(selectNombreUsuario);
  const {
    resumen, dtesContingencia,
    isLoading, error, recargar,
  } = useDashboard();

  // ── Extraer métricas del resumen ──
  const dtesPorEstado = resumen?.dtes_por_estado ?? [];

  const totalDTEs    = dtesPorEstado.reduce((s, e) => s + parseInt(e.total ?? 0, 10), 0);
  const aceptados    = dtesPorEstado.find((e) => e.estado === 'aceptado')?.total    ?? 0;
  const contingencia = dtesPorEstado.find((e) => e.estado === 'contingencia')?.total ?? 0;
  const rechazados   = dtesPorEstado.find((e) => e.estado === 'rechazado')?.total   ?? 0;

  // Datos para la gráfica — DTEs por estado
  const datosGrafica = dtesPorEstado
    .filter((e) => parseInt(e.total, 10) > 0)
    .map((e) => ({
      estado: e.estado.charAt(0).toUpperCase() + e.estado.slice(1),
      total:  parseInt(e.total, 10),
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" aria-hidden="true" />
        <p className="text-gray-600 mb-4">{error}</p>
        <Button variant="secondary" onClick={recargar}>
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Bienvenida + acción rápida */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            Bienvenido{nombreUsuario ? `, ${nombreUsuario}` : ''}
          </h1>
          <p className="page-subtitle">
            Resumen de tu actividad de facturación electrónica
          </p>
        </div>
        <Button
          onClick={() => navigate('/dtes/emitir')}
          className="hidden sm:flex"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Emitir DTE
        </Button>
      </div>

      {/* Alertas */}
      <div className="space-y-3">
        <AlertaBanner
          tipo="contingencia"
          cantidad={parseInt(contingencia, 10)}
          onVerTodos={() => navigate('/contingencia')}
        />
        <AlertaBanner
          tipo="rechazado"
          cantidad={parseInt(rechazados, 10)}
          onVerTodos={() => navigate('/dtes?estado=rechazado')}
        />
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          titulo="Total DTEs"
          valor={totalDTEs}
          icono={FileText}
          color="bg-blue-50 text-blue-600"
          descripcion="Todos los estados"
        />
        <MetricCard
          titulo="Aceptados"
          valor={parseInt(aceptados, 10)}
          icono={CheckCircle}
          color="bg-green-50 text-green-600"
          descripcion="Por Hacienda"
        />
        <MetricCard
          titulo="Contingencia"
          valor={parseInt(contingencia, 10)}
          icono={AlertTriangle}
          color="bg-yellow-50 text-yellow-600"
          descripcion="Pendientes de enviar"
        />
        <MetricCard
          titulo="Rechazados"
          valor={parseInt(rechazados, 10)}
          icono={XCircle}
          color="bg-red-50 text-red-600"
          descripcion="Requieren atención"
        />
      </div>

      {/* Gráfica + últimos eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfica de DTEs por estado */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div>
              <h2 className="font-semibold text-gray-800 font-sans">
                DTEs por estado
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Distribución general</p>
            </div>
            <TrendingUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
          </div>
          <div className="card-body">
            {datosGrafica.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={220}
                aria-label="Gráfica de DTEs por estado"
              >
                <BarChart data={datosGrafica} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="estado"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border:       '1px solid #E2E8F0',
                      fontSize:     '12px',
                    }}
                  />
                  <Bar dataKey="total" fill="#1B4FD8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center">
                <p className="text-sm text-gray-400">Sin datos para mostrar</p>
              </div>
            )}
          </div>
        </div>

        {/* Último evento de auditoría */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">
              Último evento
            </h2>
          </div>
          <div className="card-body">
            {resumen?.ultimo_evento ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 font-mono">
                  {resumen.ultimo_evento.evento}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFechaHora(resumen.ultimo_evento.creado_en)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin eventos registrados</p>
            )}

            {/* DTEs en contingencia recientes */}
            {dtesContingencia.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  En contingencia
                </p>
                <ul className="space-y-2">
                  {dtesContingencia.slice(0, 3).map((dte) => (
                    <li
                      key={dte.id}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors"
                      onClick={() => navigate(`/dtes/${dte.codigo_generacion}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          navigate(`/dtes/${dte.codigo_generacion}`);
                        }
                      }}
                    >
                      <span className="text-xs font-mono text-gray-600 truncate max-w-[120px]">
                        {nombreTipoDTE(dte.tipo_dte)}
                      </span>
                      <Badge estado={dte.estado} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botón emitir móvil */}
      <div className="sm:hidden">
        <Button
          onClick={() => navigate('/dtes/emitir')}
          fullWidth
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Emitir DTE
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
