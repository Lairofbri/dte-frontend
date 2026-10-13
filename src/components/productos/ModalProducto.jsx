// src/components/productos/ModalProducto.jsx
// Modal crear/editar producto (shadcn Dialog) — formulario del catálogo:
//   nombre*, codigo (opcional), tipo_item (CAT-011), uni_medida (CAT-014),
//   precio_unitario (input moneda con $) y tipo_venta (Gravada/No sujeta/Exenta).
// Validación client-side con react-hook-form + zod y toasts desde la página.

import { useEffect, useId, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/shadcn/select';
import FormField from '../dtes/emitir/FormField';

// Opciones fijas de tipo de venta (determinan cómo se precarga el ítem al emitir)
const OPCIONES_TIPO_VENTA = [
  { value: 'gravada',  label: 'Gravada' },
  { value: 'no_sujeta', label: 'No sujeta' },
  { value: 'exenta',   label: 'Exenta' },
];

// Validación mínima client-side (el backend Joi valida en profundidad)
const schema = z.object({
  nombre:          z.string().min(1, 'El nombre es requerido.')
    .max(1000, 'Máximo 1000 caracteres.'),
  codigo:          z.string().max(25, 'Máximo 25 caracteres.').optional().or(z.literal('')),
  tipo_item:       z.string().min(1, 'Selecciona el tipo de ítem.'),
  uni_medida:      z.string().min(1, 'Selecciona la unidad de medida.'),
  precio_unitario: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  tipo_venta:      z.enum(['gravada', 'no_sujeta', 'exenta']),
});

// Input moneda con prefijo $ (mismo formato que Paso4Pago/Paso3Items del wizard)
const InputMoneda = ({ className, ...props }) => (
  <div className={cn('relative', className)}>
    <span
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
      aria-hidden="true"
    >
      $
    </span>
    <Input className="pl-7 text-right font-mono tabular-nums" inputMode="decimal" {...props} />
  </div>
);

const ModalProducto = ({
  isOpen, onClose, onGuardar,
  producto = null,
  tiposItem = [], unidades = [],
}) => {
  const modoEdicion = !!producto;
  const formId      = useId();
  const [errorApi, setErrorApi] = useState('');

  const { register, handleSubmit, reset, control,
    formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode:     'onChange',
  });

  // Reset del formulario cada vez que se abre (nuevo o edición)
  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setErrorApi('');
      reset({
        nombre:          producto?.nombre          ?? '',
        codigo:          producto?.codigo          ?? '',
        tipo_item:       String(producto?.tipo_item ?? 2),
        uni_medida:      String(producto?.uni_medida ?? 59),
        precio_unitario: producto ? Number(producto.precio_unitario) : 0,
        tipo_venta:      producto?.tipo_venta      ?? 'gravada',
      });
    });
  }, [isOpen, producto, reset]);

  const onSubmit = async (datos) => {
    setErrorApi('');
    const payload = {
      nombre:          datos.nombre.trim(),
      codigo:          datos.codigo?.trim() || null,
      tipo_item:       Number(datos.tipo_item),
      uni_medida:      Number(datos.uni_medida),
      precio_unitario: Number(datos.precio_unitario),
      tipo_venta:      datos.tipo_venta,
    };
    try {
      await onGuardar(payload);
      onClose();
    } catch (err) {
      setErrorApi(err.response?.data?.mensaje || 'No se pudo guardar el producto.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(abierto) => { if (!abierto) onClose(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{modoEdicion ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>
            {modoEdicion
              ? 'Actualiza los datos del producto. Los ítems ya emitidos no se modifican.'
              : 'Agrega un bien o servicio para autocompletarlo al emitir DTEs.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {errorApi && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive" role="alert">{errorApi}</p>
            </div>
          )}

          {/* Nombre — descripción fiscal del ítem */}
          <FormField
            label="Nombre"
            req
            error={errors.nombre?.message}
            htmlFor={`${formId}-nombre`}
          >
            <Input
              id={`${formId}-nombre`}
              placeholder="Ej: Café molido 1 lb"
              className={cn(errors.nombre && 'border-destructive')}
              aria-invalid={!!errors.nombre}
              {...register('nombre')}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Código interno / SKU opcional */}
            <FormField
              label="Código"
              error={errors.codigo?.message}
              htmlFor={`${formId}-codigo`}
              note="SKU o código interno (máx. 25 caracteres)."
            >
              <Input
                id={`${formId}-codigo`}
                placeholder="Opcional"
                className={cn('font-mono', errors.codigo && 'border-destructive')}
                aria-invalid={!!errors.codigo}
                {...register('codigo')}
              />
            </FormField>

            {/* Precio unitario sin IVA */}
            <FormField
              label="Precio unitario ($)"
              req
              error={errors.precio_unitario?.message}
              htmlFor={`${formId}-precio`}
            >
              <InputMoneda
                id={`${formId}-precio`}
                type="number" min="0" step="0.01" placeholder="0.00"
                aria-invalid={!!errors.precio_unitario}
                {...register('precio_unitario')}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Tipo de ítem — CAT-011 */}
            <FormField
              label="Tipo de ítem"
              req
              error={errors.tipo_item?.message}
              htmlFor={`${formId}-tipo-item`}
            >
              <Controller
                name="tipo_item"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={`${formId}-tipo-item`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tiposItem.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Unidad de medida — CAT-014 */}
            <FormField
              label="Unidad de medida"
              req
              error={errors.uni_medida?.message}
              htmlFor={`${formId}-uni-medida`}
            >
              <Controller
                name="uni_medida"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={`${formId}-uni-medida`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Tipo de venta — gravada / no sujeta / exenta */}
            <FormField
              label="Tipo de venta"
              req
              error={errors.tipo_venta?.message}
              htmlFor={`${formId}-tipo-venta`}
            >
              <Controller
                name="tipo_venta"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={`${formId}-tipo-venta`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPCIONES_TIPO_VENTA.map((op) => (
                        <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : (modoEdicion ? 'Guardar cambios' : 'Crear producto')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModalProducto;