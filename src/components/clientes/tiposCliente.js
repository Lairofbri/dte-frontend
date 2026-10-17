// src/components/clientes/tiposCliente.js
// Contrato único de presentación de clientes (receptores DTE) — El Salvador.
//
// Reglas de identificación homologadas:
//   natural          → DUI o NIT (documentos homologados para personas naturales)
//   juridico         → NIT (una empresa no tiene DUI)
//   sujeto_excluido  → DUI (no es empresa; factura FSE-14)
//
// Este módulo centraliza etiquetas y la construcción del receptor por tipo de
// DTE, para que el listado, el selector y el formulario de emisión no dupliquen
// reglas (fuente única de verdad en el frontend).

import { User, Building2, ShieldCheck } from 'lucide-react';

// CAT-022 — Tipo de documento de identificación
export const DOC_DUI = '13';
export const DOC_NIT = '36';
export const DOC_CARNET = '02';
export const DOC_PASAPORTE = '03';
export const DOC_OTRO = '37';

export const TIPOS_CLIENTE = [
  {
    valor: 'natural',
    etiqueta: 'Persona natural',
    corto: 'Natural',
    descripcion: 'DUI o NIT',
    icono: User,
    acento: 'from-sky-500/15 to-cyan-500/5 text-sky-600 ring-sky-200',
  },
  {
    valor: 'juridico',
    etiqueta: 'Persona jurídica',
    corto: 'Jurídica',
    descripcion: 'Empresa · NIT',
    icono: Building2,
    acento: 'from-violet-500/15 to-indigo-500/5 text-violet-600 ring-violet-200',
  },
  {
    valor: 'sujeto_excluido',
    etiqueta: 'Sujeto excluido',
    corto: 'Sujeto excluido',
    descripcion: 'DUI · Factura FSE',
    icono: ShieldCheck,
    acento: 'from-amber-500/15 to-orange-500/5 text-amber-600 ring-amber-200',
  },
];

export const getTipoCliente = (valor) =>
  TIPOS_CLIENTE.find((t) => t.valor === valor) || TIPOS_CLIENTE[0];

// Etiquetas cortas del documento principal (fallback de presentación).
// La LISTA de tipos se consume del catálogo CAT-022 en la BD (useTiposDocumento);
// acá solo se traduce el código a una etiqueta breve para chips y listados.
export const ETIQUETA_DOC = {
  [DOC_DUI]: 'DUI',
  [DOC_NIT]: 'NIT',
  [DOC_CARNET]: 'Carnet',
  [DOC_PASAPORTE]: 'Pasaporte',
  [DOC_OTRO]: 'Doc.',
};

// Máscara de captura por código CAT-022. El formato (guiones) es presentación:
// NIT → 0000-000000-000-0, DUI → 00000000-0, el resto (pasaporte, carnet,
// otro) es texto libre.
export const maskPorTipoDocumento = (codigo) => {
  if (codigo === DOC_NIT) return 'nit';
  if (codigo === DOC_DUI) return 'dui';
  return null;
};

// Códigos CAT-022 con formato estructurado (el resto es texto libre 3-30).
export const esDocumentoEstructurado = (codigo) => codigo === DOC_NIT || codigo === DOC_DUI;

/**
 * Documento principal del cliente (DUI/NIT/pasaporte/carnet/otro).
 * Devuelve null si el cliente no tiene identificación registrada.
 */
export const documentoPrincipal = (cliente) => {
  if (!cliente) return null;
  if (cliente.tipo_documento && cliente.num_documento) {
    return {
      tipo: cliente.tipo_documento,
      numero: cliente.num_documento,
      etiqueta: ETIQUETA_DOC[cliente.tipo_documento] || 'Doc.',
    };
  }
  if (cliente.nit) {
    return { tipo: DOC_NIT, numero: cliente.nit, etiqueta: 'NIT' };
  }
  return null;
};

/** «DUI 00000000-0» / «NIT 0614-010101-001-5» / '' */
export const etiquetaDocumento = (cliente) => {
  const doc = documentoPrincipal(cliente);
  return doc ? `${doc.etiqueta} ${doc.numero}` : '';
};

/**
 * Encabezado inequívoco: «Nombre Completo — DUI 00000000-0».
 * Dos clientes pueden compartir nombre, pero nunca el documento: mostrarlo
 * evita seleccionar al homónimo equivocado.
 */
export const etiquetaCliente = (cliente) => {
  if (!cliente) return '';
  const doc = etiquetaDocumento(cliente);
  return doc ? `${cliente.nombre} — ${doc}` : cliente.nombre;
};

/** Línea secundaria para listados: documento + contacto. */
export const detalleCliente = (cliente) => {
  if (!cliente) return '';
  return [
    cliente.nombre_comercial,
    etiquetaDocumento(cliente),
    cliente.correo,
  ].filter(Boolean).join(' · ');
};

/**
 * Orden de preferencia de un cliente para un tipo de DTE. Se usa para priorizar
 * los clientes esperados sin ocultar los demás (p. ej. un sujeto excluido en FSE).
 */
export const preferenciaParaDte = (cliente, tipoDte) => {
  const tipo = cliente?.tipo_cliente;
  if (tipoDte === '14') {
    if (tipo === 'sujeto_excluido') return 0;
    if (tipo === 'natural') return 1;
    return 2;
  }
  if (tipoDte === '03' || tipoDte === '05' || tipoDte === '06') {
    return tipo === 'juridico' ? 0 : 1;
  }
  return 0;
};

/**
 * Construye el receptor para el endpoint de emisión según el tipo de DTE.
 * Mantiene el contrato del backend Joi (dte-service):
 *   01 → nombre + tipoDocumento/numDocumento
 *   03/05/06 → nit + nrc + actividad + ubicación (receptor CCF)
 *   14 → tipoDocumento/numDocumento o nit (sujeto excluido)
 */
export const receptorDeCliente = (cliente, tipoDte) => {
  if (!cliente) return null;
  const doc = documentoPrincipal(cliente);
  const nit = cliente.nit || (doc?.tipo === DOC_NIT ? doc.numero : null);

  if (tipoDte === '01') {
    return {
      nombre: cliente.nombre,
      tipo_documento: doc?.tipo || null,
      num_documento: doc?.numero || null,
      correo: cliente.correo || null,
      telefono: cliente.telefono || null,
    };
  }

  if (tipoDte === '14') {
    return {
      tipo_documento: doc?.tipo || DOC_NIT,
      num_documento: doc?.numero || nit || null,
      nit,
      nombre: cliente.nombre,
      cod_actividad: cliente.cod_actividad || null,
      desc_actividad: cliente.desc_actividad || null,
      correo: cliente.correo || null,
      telefono: cliente.telefono || null,
      departamento_cod: cliente.departamento_cod || null,
      municipio_cod: cliente.municipio_cod || null,
      distrito_cod: cliente.distrito_cod || null,
      direccion: cliente.direccion || null,
    };
  }

  // CCF (03) + NC/ND (05/06) — mismo receptor
  return {
    tipo_documento: doc?.tipo || DOC_NIT,
    num_documento: doc?.numero || nit || null,
    nit,
    nrc: cliente.nrc || null,
    nombre: cliente.nombre,
    cod_actividad: cliente.cod_actividad || null,
    desc_actividad: cliente.desc_actividad || null,
    correo: cliente.correo || null,
    telefono: cliente.telefono || null,
    departamento_cod: cliente.departamento_cod || null,
    municipio_cod: cliente.municipio_cod || null,
    distrito_cod: cliente.distrito_cod || null,
    direccion: cliente.direccion || null,
  };
};

/** Filtro de tipo_cliente sugerido para la búsqueda (null = todos). */
export const filtroSugeridoDte = (tipoDte) => {
  if (tipoDte === '03' || tipoDte === '05' || tipoDte === '06') return 'juridico';
  return null; // FCF y FSE muestran todos y se priorizan por preferenciaParaDte
};

/** Tipo de cliente por defecto al dar de alta desde un tipo de DTE. */
export const tipoClienteSugeridoDte = (tipoDte) => {
  if (tipoDte === '14') return 'sujeto_excluido';           // FSE → sujeto excluido
  if (tipoDte === '03' || tipoDte === '05' || tipoDte === '06') return 'juridico';
  return 'natural';                                          // FCF → consumidor final
};
