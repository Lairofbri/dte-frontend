// src/pages/DTEs/DTEDetalle.jsx
// Detalle completo de un DTE con timeline, QR y opción de anulación

import { useState }       from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG }      from 'qrcode.react';
import {
  ArrowLeft, XCircle, RefreshCw,
  CheckCircle, Clock, Send, FileX,
} from 'lucide-react';
import { useDTEDetalle }  from '../../hooks/useDTEDetalle';
import ModalAnulacion     from '../../components/dtes/ModalAnulacion';
import Badge              from '../../components/ui/Badge';
import Button             from '../../components/ui/Button';
import Spinner            from '../../components/ui/Spinner';
import {
  formatMonto,
  formatFecha,
  formatFechaHora,
  nombreTipoDTE,
} from '../../utils/formatters';

// ─────────────────────────────────────────────
// SUBCOMPONENTES
// ─────────────────────────────────────────────

const InfoField = ({ label, valor, mono = false }) => (
  <div>
    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
    <p className={`text-sm text-gray-800 mt-0.5 ${mono ? 'font-mono' : ''}`}>
      {valor ?? '—'}
    </p>
  </div>
);

// Timeline de estados del DTE
const PASOS_TIMELINE = [
  { estado: 'generado',    label: 'Generado',    icono: Clock       },
  { estado: 'firmado',     label: 'Firmado',     icono: CheckCircle },
  { estado: 'transmitido', label: 'Transmitido', icono: Send        },
  { estado: 'aceptado',    label: 'Aceptado',    icono: CheckCircle },
];

const ORDEN_ESTADOS = ['generado', 'firmado', 'transmitido', 'aceptado', 'rechazado'];

const TimelineDTE = ({ estado }) => {
  const indiceActual = ORDEN_ESTADOS.indexOf(estado);
  const esRechazado  = estado === 'rechazado';

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PASOS_TIMELINE.map((paso, idx) => {
        const completado = ORDEN_ESTADOS.indexOf(paso.estado) <= indiceActual && !esRechazado;
        const actual     = paso.estado === estado;

        return (
          <div key={paso.estado} className="flex items-center gap-1">
            <div className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
              ${completado || actual
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-400'
              }
            `}>
              <paso.icono className="w-3 h-3" aria-hidden="true" />
              {paso.label}
            </div>
            {idx < PASOS_TIMELINE.length - 1 && (
              <div className={`w-4 h-px ${
                ORDEN_ESTADOS.indexOf(PASOS_TIMELINE[idx + 1]?.estado) <= indiceActual && !esRechazado
                ? 'bg-green-300' : 'bg-gray-200'
              }`} />
              )}  
          </div>
        );
      })}

      {esRechazado && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <FileX className="w-3 h-3" aria-hidden="true" />
          Rechazado
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const DTEDetalle = () => {
  const { codigo }  = useParams();
  const navigate    = useNavigate();
  const [modalAbierto, setModalAbierto] = useState(false);

  // Todos los hooks ANTES de cualquier return condicional
  const { dte, isLoading, error, anulando, recargar, anular } = useDTEDetalle(codigo);

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
        <p className="text-gray-500 mb-4" role="alert">{error}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => navigate('/dtes')}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver
          </Button>
          <Button variant="secondary" onClick={recargar}>
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!dte) return null;

  // URL de consulta pública de Hacienda para el QR
  const urlConsultaHacienda = dte.sello_recepcion
    ? `https://admin.factura.gob.sv/consultaPublica?ambiente=${dte.ambiente}&codGen=${dte.codigo_generacion}&fechaEmi=${dte.fecha_emision}`
    : null;

  const puedeAnular = dte.estado === 'aceptado';

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/dtes')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
            aria-label="Volver al listado de DTEs"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver al listado
          </button>
          <h1 className="page-title">{nombreTipoDTE(dte.tipo_dte)}</h1>
          <p className="page-subtitle font-mono">{dte.numero_control ?? '—'}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge estado={dte.estado} />
          {puedeAnular && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setModalAbierto(true)}
            >
              <XCircle className="w-4 h-4" aria-hidden="true" />
              Anular
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="card p-4">
        <TimelineDTE estado={dte.estado} />
      </div>

      {/* Datos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Información del DTE */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Información del documento</h2>
          </div>
          <div className="card-body grid grid-cols-2 gap-4">
            <InfoField label="Tipo DTE"           valor={nombreTipoDTE(dte.tipo_dte)} />
            <InfoField label="Ambiente"            valor={dte.ambiente === '01' ? 'Producción' : 'Pruebas'} />
            <InfoField label="Fecha emisión"       valor={formatFecha(dte.fecha_emision)} />
            <InfoField label="Hora emisión"        valor={dte.hora_emision ?? '—'} />
            <InfoField label="Código generación"   valor={dte.codigo_generacion} mono />
            <InfoField label="Número control"      valor={dte.numero_control} mono />
            {dte.sello_recepcion && (
              <div className="col-span-2">
                <InfoField label="Sello de recepción" valor={dte.sello_recepcion} mono />
              </div>
            )}
            {dte.errores_hacienda && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                  Errores Hacienda
                </p>
                <p className="text-sm text-red-600 mt-0.5" role="alert">
                  {dte.errores_hacienda}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* QR de consulta */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Verificación</h2>
          </div>
          <div className="card-body flex flex-col items-center gap-3">
            {urlConsultaHacienda ? (
              <>
                <QRCodeSVG
                  value={urlConsultaHacienda}
                  size={140}
                  aria-label="Código QR para verificar el DTE en el portal de Hacienda"
                />
                <p className="text-xs text-gray-400 text-center">
                  Escanea para verificar en el portal de Hacienda
                </p>
                <a
                  href={urlConsultaHacienda}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:underline"
                >
                  Verificar en Hacienda
                </a>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                El QR estará disponible cuando el DTE sea aceptado por Hacienda.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Datos del receptor */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-800 font-sans">Receptor</h2>
        </div>
        <div className="card-body grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoField label="Nombre"  valor={dte.receptor_nombre ?? 'Consumidor final'} />
          <InfoField label="NIT"     valor={dte.receptor_nit}  mono />
          <InfoField label="NRC"     valor={dte.receptor_nrc}  mono />
        </div>
      </div>

      {/* Montos */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-800 font-sans">Montos</h2>
        </div>
        <div className="card-body grid grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoField label="Total gravado" valor={formatMonto(dte.total_gravado)} mono />
          <InfoField label="IVA (13%)"     valor={formatMonto(dte.total_iva)}     mono />
          <InfoField label="Total"         valor={formatMonto(dte.total)}         mono />
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-400 flex gap-4">
        <span>Creado: {formatFechaHora(dte.creado_en)}</span>
        <span>Actualizado: {formatFechaHora(dte.actualizado_en)}</span>
      </div>

      {/* Modal de anulación */}
      <ModalAnulacion
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onConfirmar={anular}
        anulando={anulando}
        numeroDTE={dte.numero_control ?? dte.codigo_generacion}
      />
    </div>
  );
};

export default DTEDetalle;
