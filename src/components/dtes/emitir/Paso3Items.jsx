// src/components/dtes/emitir/Paso3Items.jsx
// Paso 3 del wizard — ítems de la factura.
// Cada ítem muestra lo esencial (descripción, cantidad, precio, importe) y
// despliega "Opciones fiscales" (tipo, unidad, descuento, no sujeta/exenta).

import { Plus, Trash2, ChevronDown, Package } from 'lucide-react';
import { Controller } from 'react-hook-form';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/shadcn/collapsible';
import { Separator } from '@/components/shadcn/separator';
import { formatMonto } from '../../../utils/formatters';
import SelectorProducto from '../../productos/SelectorProducto';
import FormField from './FormField';
import PanelTotales from './PanelTotales';

const ITEM_VACIO = {
  descripcion: '', codigo: '', tipo_item: '2', uni_medida: '59',
  cantidad: 1, precio_unitario: 0,
  descuento_pct: 0, venta_no_suj: 0, venta_exenta: 0, compra: 0,
};

const InputMoneda = ({ ...props }) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden="true">
      $
    </span>
    <Input className="pl-7 text-right font-mono tabular-nums" inputMode="decimal" {...props} />
  </div>
);

const ItemRow = ({ idx, item, register, errors, control, setValue, tiposItem, unidades, esFSE, onRemove, puedeRemover }) => {
  const errorDescripcion = errors.items?.[idx]?.descripcion;
  const importe = (Number(item?.cantidad) || 0) * (Number(item?.precio_unitario) || 0);

  // Precarga el ítem completo desde un producto del catálogo: el resto del
  // ítem (código, tipo, unidad, precio, tratamiento fiscal) sigue al producto.
  // La cantidad queda en 1 y es ajustable; el importe de ventas no sujetas/
  // exentas se precarga si el producto es no_sujeta o exenta.
  const aplicarProducto = (idxCampo, producto, fieldDescripcion) => {
    const sub = Number(producto.precio_unitario) || 0;
    fieldDescripcion.onChange(producto.nombre);
    setValue(`items.${idxCampo}.codigo`,         producto.codigo ?? '');
    setValue(`items.${idxCampo}.tipo_item`,      String(producto.tipo_item));
    setValue(`items.${idxCampo}.uni_medida`,     String(producto.uni_medida));
    setValue(`items.${idxCampo}.precio_unitario`, sub);
    setValue(`items.${idxCampo}.venta_no_suj`,   producto.tipo_venta === 'no_sujeta' ? sub : 0);
    setValue(`items.${idxCampo}.venta_exenta`,   producto.tipo_venta === 'exenta'    ? sub : 0);
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-card">
      {/* Cabecera del ítem */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Package className="size-3.5" aria-hidden="true" />
          Ítem {idx + 1}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!puedeRemover}
          aria-label={`Eliminar ítem ${idx + 1}`}
          className="text-muted-foreground hover:text-destructive disabled:opacity-30"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Campos primarios */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <FormField
            label="Descripción"
            req
            error={errorDescripcion?.message}
            htmlFor={`item-${idx}-desc`}
          >
            <Controller
              name={`items.${idx}.descripcion`}
              control={control}
              render={({ field }) => (
                <SelectorProducto
                  id={`item-${idx}-desc`}
                  value={field.value ?? ''}
                  error={!!errorDescripcion}
                  placeholder="Seleccionar producto del catálogo…"
                  onSeleccionar={(p) => aplicarProducto(idx, p, field)}
                  onManual={(texto) => field.onChange(texto)}
                />
              )}
            />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label="Cantidad" req htmlFor={`item-${idx}-cant`}>
            <Input
              id={`item-${idx}-cant`}
              type="number" min="0.0001" step="0.0001"
              className="text-right font-mono tabular-nums"
              inputMode="decimal"
              {...register(`items.${idx}.cantidad`)}
            />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label="Precio" req htmlFor={`item-${idx}-precio`}>
            <InputMoneda
              id={`item-${idx}-precio`}
              type="number" min="0.01" step="0.01"
              {...register(`items.${idx}.precio_unitario`)}
            />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label="Importe" htmlFor={`item-${idx}-importe`}>
            <div
              id={`item-${idx}-importe`}
              className="flex h-10 items-center justify-end rounded-md border bg-muted/50 px-3 font-mono text-sm tabular-nums text-muted-foreground"
            >
              {formatMonto(importe)}
            </div>
          </FormField>
        </div>
      </div>

      {/* Opciones fiscales */}
      <Collapsible className="mt-3">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="group gap-1.5 px-0 hover:bg-transparent">
            <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            <span className="text-xs font-medium text-muted-foreground">Opciones fiscales</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-4">
          <FormField label="Tipo de ítem" htmlFor={`item-${idx}-tipo`}>
            <Controller
              name={`items.${idx}.tipo_item`}
              control={control}
              render={({ field }) => (
                <Select value={String(field.value ?? '2')} onValueChange={(v) => field.onChange(v)}>
                  <SelectTrigger id={`item-${idx}-tipo`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tiposItem.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Unidad de medida" htmlFor={`item-${idx}-uni`}>
            <Controller
              name={`items.${idx}.uni_medida`}
              control={control}
              render={({ field }) => (
                <Select value={String(field.value ?? '59')} onValueChange={(v) => field.onChange(v)}>
                  <SelectTrigger id={`item-${idx}-uni`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Descuento %" error={errors.items?.[idx]?.descuento_pct?.message} htmlFor={`item-${idx}-desc-pct`}>
            <div className="relative">
              <Input
                id={`item-${idx}-desc-pct`}
                type="number" min="0" max="99.99" step="0.01"
                placeholder="0"
                className="pr-8 text-right font-mono tabular-nums"
                {...register(`items.${idx}.descuento_pct`)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" aria-hidden="true">%</span>
            </div>
          </FormField>

          {esFSE ? (
            <FormField label="Compra ($)" htmlFor={`item-${idx}-compra`}>
              <InputMoneda
                id={`item-${idx}-compra`}
                type="number" min="0" step="0.01" placeholder="0.00"
                {...register(`items.${idx}.compra`)}
              />
            </FormField>
          ) : (
            <>
              <FormField label="Venta no sujeta ($)" htmlFor={`item-${idx}-nosuj`}>
                <InputMoneda
                  id={`item-${idx}-nosuj`}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  {...register(`items.${idx}.venta_no_suj`)}
                />
              </FormField>
              <FormField label="Venta exenta ($)" htmlFor={`item-${idx}-exenta`}>
                <InputMoneda
                  id={`item-${idx}-exenta`}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  {...register(`items.${idx}.venta_exenta`)}
                />
              </FormField>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const Paso3Items = ({
  register, errors, control, setValue,
  itemFields, appendItem, removeItem, itemsActuales,
  tiposItem, unidades, esFSE, tipoDte, totales,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Ítems</h2>
          <p className="text-sm text-muted-foreground">
            {itemFields.length} {itemFields.length === 1 ? 'ítem' : 'ítems'} · importes en dólares estadounidenses
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => appendItem({ ...ITEM_VACIO })}>
            <Plus className="size-4" data-icon="inline-start" />
            Agregar ítem
          </Button>
        </div>
      </div>

      {errors.items?.root?.message && (
        <p className="text-sm text-destructive" role="alert">{errors.items.root.message}</p>
      )}

      {itemFields.map((field, idx) => (
        <ItemRow
          key={field.id}
          idx={idx}
          item={itemsActuales[idx]}
          register={register}
          errors={errors}
          control={control}
          setValue={setValue}
          tiposItem={tiposItem}
          unidades={unidades}
          esFSE={esFSE}
          onRemove={() => removeItem(idx)}
          puedeRemover={itemFields.length > 1}
        />
      ))}

      <Separator />

      {/* Totales inline — visible siempre (el panel sticky solo en xl) */}
      <PanelTotales totales={totales} tipoDte={tipoDte} items={itemsActuales} className="xl:hidden" />
    </div>
  );
};

export default Paso3Items;
export { ITEM_VACIO };