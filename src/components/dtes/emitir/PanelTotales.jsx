// src/components/dtes/emitir/PanelTotales.jsx
// Panel de totales en vivo del wizard — estructura Hacienda según tipo DTE.
// Desktop: columna sticky. Tiene su propio título de sección para reutilizarse.

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Separator } from '@/components/shadcn/separator';
import { formatMonto } from '../../../utils/formatters';
import { numeroALetras } from './calcularTotales';

const Fila = ({ label, valor, clase = 'text-muted-foreground' }) => (
  <div className="flex items-baseline justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn('font-mono tabular-nums', clase)}>{formatMonto(valor)}</span>
  </div>
);

const PanelTotales = ({ totales, tipoDte, items, className }) => {
  const esFSE = tipoDte === '14';
  const esCCFONCND = tipoDte === '03' || tipoDte === '05' || tipoDte === '06';

  return (
    <Card className={cn('shadow-card', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Totales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        {esFSE ? (
          <>
            <Fila label="Total compra" valor={totales.totalCompra} />
            {totales.descuGravada > 0 && (
              <Fila label="Descuento" valor={-totales.descuGravada} clase="text-emerald-600" />
            )}
            <Fila label="Subtotal" valor={totales.subTotalFSE} />
            {totales.reteRenta > 0 && (
              <Fila label="Retención Renta" valor={totales.reteRenta} clase="text-orange-600" />
            )}
          </>
        ) : (
          <>
            <Fila label="Total no sujeto" valor={totales.totalNoSuj} />
            <Fila label="Total exento" valor={totales.totalExenta} />
            <Fila label="Total gravado" valor={totales.totalGravada} />
            <Fila label="Subtotal ventas" valor={totales.subTotalVentas} />
            {totales.descuGravada > 0 && (
              <Fila label="Descuento" valor={-totales.descuGravada} clase="text-emerald-600" />
            )}
            <Fila label="Subtotal" valor={totales.subTotal} />
            {esCCFONCND && <Fila label="IVA 13% (tributo 20)" valor={totales.ivaValor} />}
            {tipoDte === '01' && <Fila label="IVA 13% (incluido)" valor={totales.ivaValor} />}
          </>
        )}

        <Separator className="my-1" />

        <Fila
          label="Total a pagar"
          valor={totales.totalPagar}
          clase="font-semibold text-foreground text-base"
        />

        {totales.totalPagar > 0 && (
          <p className="pt-1 text-xs italic leading-relaxed text-muted-foreground">
            {numeroALetras(totales.totalPagar)}
          </p>
        )}

        {items && items.length > 0 && (
          <p className="pt-1 text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'ítem' : 'ítems'} en la factura
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PanelTotales;