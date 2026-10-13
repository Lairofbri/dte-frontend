// src/components/dtes/emitir/Paso5Resumen.jsx
// Paso 5 del wizard — revisión final antes de emitir.
// Todo código fiscal se muestra con su descripción de la base de datos
// (formas de pago, tipo de ítem), nunca como código "seco".
// El documento se firma internamente con el certificado configurado en
// Configuración — passwordPri NO se pide aquí (ni se envía al frontend).

import { Lock, Loader2 } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { Separator } from '@/components/shadcn/separator';
import { formatMonto } from '../../../utils/formatters';
import { getTipoDTE } from './catalogos';
import PanelTotales from './PanelTotales';

const TIPOS_DOC_REL = [
  ['01', 'FCF (01)'],
  ['03', 'CCF (03)'],
  ['04', 'Nota de Remisión (04)'],
  ['05', 'Nota de Crédito (05)'],
  ['06', 'Nota de Débito (06)'],
];

const FilaRecap = ({ label, valor, mono = false }) => (
  <div className="flex items-baseline justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={mono ? 'font-mono text-sm' : 'text-right font-medium text-foreground'}>{valor || '—'}</span>
  </div>
);

const Paso5Resumen = ({
  control,
  totales, tipoDte, itemsActuales,
  formasPago, fcfConDatos,
  isLoading, onAtras, onCancelar,
}) => {
  const tipo = getTipoDTE(tipoDte);

  // Recorridos "en vivo" para el resumen (mismos valores que se emitirán)
  const receptor = useWatch({ control, name: [
    'rec_nombre', 'rec_nit', 'rec_nrc', 'rec_correo',
  ] }) ?? [];
  const [recNombre, recNit, recNrc, recCorreo] = receptor;

  const docRel = useWatch({ control, name: ['doc_rel_codgen', 'doc_rel_tipo', 'doc_rel_fecha'] }) ?? [];
  const [docCodgen, docTipo, docFecha] = docRel;

  const pagoValues = useWatch({ control, name: 'pagos' }) ?? [];

  const formasPagoMap = Object.fromEntries(formasPago.map((f) => [f.value, f.label]));
  const esFCF = tipoDte === '01';

  return (
    <div className="space-y-5">
      {/* ── Tipo de documento ── */}
      {tipo && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-card">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <tipo.icono className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{tipo.titulo}</p>
            <p className="text-xs text-muted-foreground">Documento tributario electrónico {tipo.sigla} (tipo {tipo.valor})</p>
          </div>
          <Badge variant="outline" className="font-mono">{tipo.sigla}</Badge>
        </div>
      )}

      {/* ── Receptor ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Receptor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {esFCF && !fcfConDatos ? (
            <p className="text-sm text-muted-foreground">Consumidor final — sin datos</p>
          ) : (
            <>
              <FilaRecap label="Nombre / razón social" valor={recNombre} />
              {recNit && <FilaRecap label="NIT" valor={recNit} mono />}
              {!recNit && recNrc && <FilaRecap label="NRC" valor={recNrc} mono />}
              {recCorreo && <FilaRecap label="Correo" valor={recCorreo} />}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Documento relacionado (NC/ND) ── */}
      {(tipoDte === '05' || tipoDte === '06') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Documento relacionado</CardTitle>
            <CardDescription className="text-xs">DTE original que se corrige</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <FilaRecap
              label="Tipo"
              valor={docTipo ? (TIPOS_DOC_REL.find(([v]) => v === docTipo)?.[1] ?? docTipo) : ''}
            />
            <FilaRecap label="Código de generación" valor={docCodgen} mono />
            {docFecha && <FilaRecap label="Fecha de emisión" valor={docFecha} />}
          </CardContent>
        </Card>
      )}

      {/* ── Ítems ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ítems ({itemsActuales.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {itemsActuales.map((item, idx) => (
            <div key={idx} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">
                {item.descripcion || `Ítem ${idx + 1}`}
                <span className="ml-1 text-xs text-muted-foreground">
                  × {item.cantidad} @ {formatMonto(item.precio_unitario)}
                </span>
              </span>
              <span className="font-mono tabular-nums text-foreground">
                {formatMonto((Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0))}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Pagos ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Formas de pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {pagoValues.map((pago, idx) => (
            <FilaRecap
              key={idx}
              label={formasPagoMap[pago.codigo] || pago.codigo}
              valor={formatMonto(pago.montoPago)}
              mono
            />
          ))}
          <Separator className="my-1" />
          <FilaRecap label="Total a pagar" valor={formatMonto(totales.totalPagar)} mono />
        </CardContent>
      </Card>

      {/* ── Totales (móvil) ── */}
      <PanelTotales totales={totales} tipoDte={tipoDte} items={itemsActuales} className="xl:hidden" />

      {/* ── Firma interna (sin campo de contraseña) ── */}
      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Lock className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">Firma electrónica</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            El documento se firma automáticamente con el certificado y la contraseña configurados en{' '}
            <span className="font-medium text-foreground">Configuración</span>. No hace falta
            ingresar la contraseña aquí.
          </p>
        </div>
      </div>

      {/* ── Acciones ── */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onAtras} disabled={isLoading}>
          ← Volver al paso anterior
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="min-w-40">
          {isLoading
            ? <><Loader2 className="size-4 animate-spin" data-icon="inline-start" /> Emitiendo...</>
            : 'Emitir DTE'}
        </Button>
      </div>
    </div>
  );
};

export default Paso5Resumen;