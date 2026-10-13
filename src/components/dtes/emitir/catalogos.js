// src/components/dtes/emitir/catalogos.js
// Metadatos de presentación del wizard de emisión.
// Los catálogos oficiales de Hacienda (CAT-011, CAT-014, CAT-017, CAT-018,
// CAT-012, CAT-022…) NO se duplican en el frontend: viven en la base de datos
// (migración 027, tablas cat_* — globales para todas las empresas) y se
// consumen por GET /api/catalogos/:slug vía useCatalogosUI.

import {
  Receipt, FileText, Undo2, Redo2, ShieldCheck,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Tipos de DTE del wizard — Paso 1
// (solo presentación: ícono, descripción amigable y chips; los códigos
// oficiales 01/03/05/06/14 corresponden a CAT-002 en la BD)
// ─────────────────────────────────────────────
export const TIPOS_DTE = [
  {
    valor: '01',
    sigla: 'FCF',
    titulo: 'Factura Consumidor Final',
    descripcion: 'Ventas al consumidor final. Los datos del receptor son opcionales.',
    icono: Receipt,
    chips: ['Receptor opcional', 'Aplica IVA 13%'],
  },
  {
    valor: '03',
    sigla: 'CCF',
    titulo: 'Comprobante de Crédito Fiscal',
    descripcion: 'Ventas a contribuyentes que requieren acreditar IVA.',
    icono: FileText,
    chips: ['Receptor con NIT requerido'],
  },
  {
    valor: '05',
    sigla: 'NC',
    titulo: 'Nota de Crédito',
    descripcion: 'Corrige o anula total o parcialmente un DTE emitido.',
    icono: Undo2,
    chips: ['Requiere DTE relacionado'],
  },
  {
    valor: '06',
    sigla: 'ND',
    titulo: 'Nota de Débito',
    descripcion: 'Incrementa el valor de un DTE emitido.',
    icono: Redo2,
    chips: ['Requiere DTE relacionado'],
  },
  {
    valor: '14',
    sigla: 'FSE',
    titulo: 'Factura Sujeto Excluido',
    descripcion: 'Ventas de bienes o servicios excluidos del IVA.',
    icono: ShieldCheck,
    chips: ['Receptor con NIT requerido', 'Sin IVA'],
  },
];

export const getTipoDTE = (valor) => TIPOS_DTE.find((t) => t.valor === valor);