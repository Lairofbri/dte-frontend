// src/utils/formatters.js
// Funciones de formato reutilizables en todo el frontend

/**
 * Formatea un monto en USD
 * Ej: 1095 → "$1,095.00"
 */
export const formatMonto = (monto) => {
  if (monto === null || monto === undefined) return '$0.00';
  const num = Number(monto);
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: 'USD',
  }).format(num);
};

/**
 * Formatea una fecha ISO a formato legible
 * Ej: "2026-05-10T06:38:32.025Z" → "10/05/2026"
 */
export const formatFecha = (fecha) => {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-SV', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
};

/**
 * Formatea fecha y hora
 * Ej: "10/05/2026 06:38"
 */
export const formatFechaHora = (fecha) => {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-SV', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
};

/**
 * Acorta un UUID o código de generación para mostrar en tablas
 * Ej: "CF33A2EA-72D3-4C16-A9CE-811148B478BF" → "CF33A2EA..."
 */
export const acortarCodigo = (codigo) => {
  if (!codigo) return '—';
  return `${codigo.substring(0, 8).toUpperCase()}...`;
};

/**
 * Mapea el tipo de DTE a su nombre completo
 */
export const nombreTipoDTE = (tipoDte) => {
  const tipos = {
    '01': 'Factura (FCF)',
    '03': 'Crédito Fiscal (CCF)',
    '04': 'Nota de Remisión',
    '05': 'Nota de Crédito',
    '06': 'Nota de Débito',
    '07': 'Comp. Retención',
    '11': 'Factura Exportación',
    '14': 'Sujeto Excluido (FSE)',
    '15': 'Comp. Donación',
  };
  return tipos[tipoDte] || tipoDte;
};

/**
 * Mapea el estado del DTE a etiqueta y clase CSS
 */
export const infoEstado = (estado) => {
  const estados = {
    aceptado:     { label: 'Aceptado',     clase: 'badge-aceptado'     },
    rechazado:    { label: 'Rechazado',    clase: 'badge-rechazado'    },
    contingencia: { label: 'Contingencia', clase: 'badge-contingencia' },
    generado:     { label: 'Generado',     clase: 'badge-generado'     },
    firmado:      { label: 'Firmado',      clase: 'badge-firmado'      },
    transmitido:  { label: 'Transmitido',  clase: 'badge-transmitido'  },
    anulado:      { label: 'Anulado',      clase: 'badge-anulado'      },
  };
  return estados[estado] || { label: estado, clase: 'badge-generado' };
};

/**
 * Mapea el tipo de contingencia a su descripción
 */
export const nombreTipoContingencia = (tipo) => {
  const tipos = {
    1: 'No disponibilidad del sistema MH',
    2: 'No disponibilidad de internet',
    3: 'Falla en equipo del emisor',
    4: 'Desastre natural',
    5: 'Otro',
  };
  return tipos[tipo] || `Tipo ${tipo}`;
};
