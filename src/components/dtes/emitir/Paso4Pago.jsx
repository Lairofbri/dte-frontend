// src/components/dtes/emitir/Paso4Pago.jsx
// Paso 4 del wizard — condición de operación y formas de pago.
// Pago rápido en efectivo (monto recibido → vuelto), herramientas para
// cuadrar el total y campos de plazo/período solo en condición crédito.

import { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2, AlertTriangle, Banknote } from 'lucide-react';
import { Controller, useWatch } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group';
import { Separator } from '@/components/shadcn/separator';
import { Badge } from '@/components/shadcn/badge';
import { formatMonto } from '../../../utils/formatters';
import FormField from './FormField';

const PAGO_VACIO = { codigo: '01', montoPago: 0, referencia: '', plazo: null, periodo: null };
export { PAGO_VACIO };

// Referencia estable para useWatch (evita arrays nuevos en cada render)
const SIN_PAGOS = [];

const CONDICIONES = [
  { valor: 1, label: 'Contado (1)' },
  { valor: 2, label: 'Crédito (2)' },
  { valor: 3, label: 'Otro (3)' },
];

const InputMoneda = ({ ...props }) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden="true">
      $
    </span>
    <Input className="pl-7 text-right font-mono tabular-nums" inputMode="decimal" {...props} />
  </div>
);

const Paso4Pago = ({
  register, errors, control, setValue,
  pagoFields, appendPago, removePago,
  condicion, setCondicion,
  totalPagar, formasPago, plazos,
}) => {
  const pagoValues = useWatch({ control, name: 'pagos' }) ?? SIN_PAGOS;

  // Total cubierto por las formas de pago vs total del documento
  const sumaPagos = pagoValues.reduce((acc, p) => acc + (Number(p.montoPago) || 0), 0);
  const diferencia = Number(totalPagar) - sumaPagos;
  const cuadra = Math.abs(diferencia) <= 0.005;
  const esEfectivoUnico = pagoValues.length === 1 && pagoValues[0]?.codigo === '01';

  // ── Pago rápido en efectivo ──
  const [recibido, setRecibido] = useState('');
  const efectivoRapido = condicion === 1 && esEfectivoUnico;
  const recibidoNum = Number(recibido);
  const vuelto = !isNaN(recibidoNum) && recibidoNum > Number(totalPagar)
    ? recibidoNum - Number(totalPagar)
    : 0;

  // Si hay monto recibido válido, el pago cubre el total (o lo que alcance)
  useEffect(() => {
    if (!efectivoRapido) return;
    if (!recibido.trim() || isNaN(recibidoNum)) return;
    const monto = Math.max(0, Math.min(recibidoNum, Number(totalPagar)));
    setValue('pagos.0.montoPago', Math.round(monto * 100) / 100, { shouldValidate: true });
  }, [efectivoRapido, recibido, recibidoNum, totalPagar, setValue]);

  // Por defecto, una sola forma de pago cubre el total exacto (Hacienda exige
  // que la suma de pagos coincida con el monto fiscal — validarPagosContraTotal)
  useEffect(() => {
    if (pagoValues.length !== 1) return;
    const monto = Number(pagoValues[0]?.montoPago);
    if ((!monto || isNaN(monto)) && Number(totalPagar) > 0) {
      setValue('pagos.0.montoPago', Math.round(Number(totalPagar) * 100) / 100, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [pagoValues, totalPagar, setValue]);

  const esCredito = condicion === 2;

  return (
    <div className="space-y-5">
      {/* Condición de operación */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Condición de operación</p>
        <ToggleGroup
          type="single"
          value={String(condicion)}
          onValueChange={(v) => { if (v) setCondicion(Number(v)); }}
          className="justify-start"
        >
          {CONDICIONES.map((c) => (
            <ToggleGroupItem key={c.valor} value={String(c.valor)} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              {c.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Pago rápido efectivo */}
      {efectivoRapido && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Pago rápido en efectivo
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="Monto recibido" htmlFor="pago-recibido">
              <InputMoneda
                id="pago-recibido"
                type="number" min="0" step="0.01"
                placeholder="0.00"
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
              />
            </FormField>
            <div>
              <p className="mb-1 text-sm font-medium text-emerald-800">Total a pagar</p>
              <p className="flex h-10 items-center rounded-md border border-emerald-200 bg-white px-3 font-mono text-sm font-semibold tabular-nums text-emerald-900">
                {formatMonto(totalPagar)}
              </p>
            </div>
            {vuelto > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium text-emerald-800">Vuelto</p>
                <p className="flex h-10 items-center rounded-md border border-emerald-300 bg-white px-3 font-mono text-sm font-semibold tabular-nums text-emerald-700">
                  {formatMonto(vuelto)}
                </p>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            El monto de la forma de pago se ajusta automáticamente al total.
            {vuelto > 0 && ' El vuelto se muestra como referencia, no se factura.'}
          </p>
        </div>
      )}

      {/* Formas de pago */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Formas de pago</p>
          <Badge
            variant="outline"
            className={cn(
              'font-mono',
              cuadra ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            )}
          >
            {cuadra ? 'Cuadrado' : `${diferencia > 0 ? 'Faltante' : 'Sobrante'}: ${formatMonto(Math.abs(diferencia))}`}
          </Badge>
        </div>

        {!cuadra && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {diferencia > 0
              ? `Falta cubrir ${formatMonto(diferencia)} del total. Ajustá el monto o agregá otra forma de pago.`
              : `Los pagos superan el total por ${formatMonto(-diferencia)}. Revisá los montos.`}
          </p>
        )}

        {pagoFields.map((field, idx) => (
          <div key={field.id} className="rounded-xl border bg-white p-4 shadow-card">
            {/* Cabecera del pago */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Banknote className="size-3.5" aria-hidden="true" />
                Forma de pago {idx + 1}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removePago(idx)}
                disabled={pagoFields.length === 1}
                aria-label={`Eliminar forma de pago ${idx + 1}`}
                className="text-muted-foreground hover:text-destructive disabled:opacity-30"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Fila 1: forma de pago (ancha) + monto + referencia */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <FormField label="Forma de pago" req htmlFor={`pago-${idx}-codigo`}>
                  <Controller
                    name={`pagos.${idx}.codigo`}
                    control={control}
                    render={({ field: f }) => (
                      <Select value={f.value || undefined} onValueChange={f.onChange}>
                        <SelectTrigger id={`pago-${idx}-codigo`}>
                          {f.value ? <SelectValue /> : 'Seleccionar...'}
                        </SelectTrigger>
                        <SelectContent>
                          {formasPago.map((fp) => (
                            <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>
              <div className="sm:col-span-3">
                <FormField label="Monto" req error={errors.pagos?.[idx]?.montoPago?.message} htmlFor={`pago-${idx}-monto`}>
                  <InputMoneda
                    id={`pago-${idx}-monto`}
                    type="number" min="0.01" step="0.01"
                    className={cn(errors.pagos?.[idx]?.montoPago && 'border-destructive')}
                    aria-invalid={!!errors.pagos?.[idx]?.montoPago}
                    {...register(`pagos.${idx}.montoPago`)}
                  />
                </FormField>
              </div>
              <div className="sm:col-span-4">
                <FormField label="Referencia" htmlFor={`pago-${idx}-ref`}>
                  <Input
                    id={`pago-${idx}-ref`}
                    placeholder="Núm. transacción / cheque / transferencia..."
                    {...register(`pagos.${idx}.referencia`)}
                  />
                </FormField>
              </div>
            </div>

            {/* Fila 2: plazo y período (solo habilitados en crédito) */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <FormField
                  label="Plazo"
                  note={!esCredito ? 'Solo en condición Crédito' : undefined}
                  htmlFor={`pago-${idx}-plazo`}
                >
                  <Controller
                    name={`pagos.${idx}.plazo`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        value={f.value || undefined}
                        onValueChange={f.onChange}
                        disabled={!esCredito}
                      >
                        <SelectTrigger id={`pago-${idx}-plazo`}>
                          {f.value ? <SelectValue /> : '— plazo —'}
                        </SelectTrigger>
                        <SelectContent>
                          {plazos.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>
              <div className="sm:col-span-3">
                <FormField
                  label="Período"
                  note={!esCredito ? undefined : 'Ej: 30 días, 2 meses, 1 año'}
                  htmlFor={`pago-${idx}-periodo`}
                >
                  <Input
                    id={`pago-${idx}-periodo`}
                    type="number" min="1" step="1"
                    placeholder="30"
                    disabled={!esCredito}
                    className="text-right font-mono"
                    {...register(`pagos.${idx}.periodo`)}
                  />
                </FormField>
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => appendPago({ ...PAGO_VACIO })}>
            <Plus className="size-4" data-icon="inline-start" />
            Agregar otra forma de pago
          </Button>
          {!efectivoRapido && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => pagoFields.forEach((_, idx) => {
                if (idx === 0) setValue('pagos.0.montoPago', Math.round(Number(totalPagar) * 100) / 100, { shouldValidate: true });
              })}
            >
              Pagar todo con la primera forma
            </Button>
          )}
        </div>
      </div>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Total a pagar: <span className="font-mono font-semibold text-foreground">{formatMonto(totalPagar)}</span>
      </p>
    </div>
  );
};

export default Paso4Pago;