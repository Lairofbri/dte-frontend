// src/pages/DTEs/DTEEmitir.jsx
// Formulario para emitir DTEs: FCF, CCF y FSE
//
// SEGURIDAD:
// → passwordPri NUNCA en estado persistente
// → Se limpia después de emitir (éxito o error)
// → Validación en frontend antes de enviar al backend

import { useState }                from 'react';
import { useNavigate }             from 'react-router-dom';
import { useForm, useFieldArray }  from 'react-hook-form';
import { zodResolver }             from '@hookform/resolvers/zod';
import { z }                       from 'zod';
import { Plus, Trash2, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useEmitirDTE, calcularTotales } from '../../hooks/useEmitirDTE';
import { formatMonto }             from '../../utils/formatters';

// ─────────────────────────────────────────────
// SCHEMAS ZOD POR TIPO DE DTE
// ─────────────────────────────────────────────
const itemSchema = z.object({
  descripcion:     z.string().min(1, 'La descripción es requerida.'),
  cantidad:        z.coerce.number().positive('La cantidad debe ser mayor a 0.'),
  precio_unitario: z.coerce.number().positive('El precio debe ser mayor a 0.'),
  descuento_pct:   z.coerce.number().min(0, 'El descuento no puede ser negativo.')
                     .max(99.99, 'El descuento máximo es 99.99% — el total mínimo es $0.01.')
                     .default(0),
});

const schemaBase = z.object({
  tipo_dte:    z.enum(['01', '03', '14']),
  items:       z.array(itemSchema).min(1, 'Agrega al menos un ítem.'),
  password_pri: z.string().min(1, 'La contraseña de firma es requerida.'),
});

const schemaFCF = schemaBase.extend({
  receptor_nombre: z.string().optional(),
});

const schemaCCF = schemaBase.extend({
  receptor_nombre: z.string().min(1, 'El nombre del receptor es requerido.'),
  receptor_nit:    z.string().min(1, 'El NIT del receptor es requerido.'),
  receptor_nrc:    z.string().min(1, 'El NRC del receptor es requerido.'),
});

const schemaFSE = schemaBase.extend({
  receptor_nombre: z.string().min(1, 'El nombre del receptor es requerido.'),
  receptor_nit:    z.string().min(1, 'El NIT del receptor es requerido.'),
});

const getSchema = (tipoDte) => {
  if (tipoDte === '03') return schemaCCF;
  if (tipoDte === '14') return schemaFSE;
  return schemaFCF;
};

// ─────────────────────────────────────────────
// ITEM POR DEFECTO
// ─────────────────────────────────────────────
const itemVacio = {
  descripcion:     '',
  cantidad:        1,
  precio_unitario: 0,
  descuento_pct:   0,
};

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────
const DTEEmitir = () => {
  const navigate          = useNavigate();
  const { emitir }        = useEmitirDTE();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tipoDteActual, setTipoDteActual] = useState('01');

  // Todos los hooks ANTES de cualquier return condicional
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(getSchema(tipoDteActual)),
    defaultValues: {
      tipo_dte:        '01',
      receptor_nombre: '',
      receptor_nit:    '',
      receptor_nrc:    '',
      items:           [itemVacio],
      password_pri:    '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Observar items para calcular totales en tiempo real
  const itemsActuales = watch('items') ?? [];
  const totales       = calcularTotales(itemsActuales, tipoDteActual);

  const onSubmit = async (datos) => {
    setIsLoading(true);
    try {
      await emitir({
        tipoDte:     datos.tipo_dte,
        receptor: {
          nombre: datos.receptor_nombre || undefined,
          nit:    datos.receptor_nit    || undefined,
          nrc:    datos.receptor_nrc    || undefined,
        },
        items:       datos.items,
        passwordPri: datos.password_pri,
      });
      // Si llega aquí es éxito — el hook navega al detalle
    } catch (_) {
      // El hook ya mostró el toast de error
      // Limpiar solo el passwordPri — mantener el resto del formulario
      reset((values) => ({ ...values, password_pri: '' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTipoCambio = (e) => {
    setTipoDteActual(e.target.value);
  };

  const requiereNIT = tipoDteActual === '03' || tipoDteActual === '14';
  const requiereNRC = tipoDteActual === '03';

  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/dtes')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
          aria-label="Volver al listado de DTEs"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Volver al listado
        </button>
        <h1 className="page-title">Emitir DTE</h1>
        <p className="page-subtitle">Completa el formulario para emitir un documento tributario</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* SECCIÓN 1 — Tipo de DTE */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Tipo de documento</h2>
          </div>
          <div className="card-body">
            <label htmlFor="tipo_dte" className="label">Tipo de DTE</label>
            <select
              id="tipo_dte"
              className="input max-w-xs"
              {...register('tipo_dte', {
                onChange: handleTipoCambio,
              })}
            >
              <option value="01">Factura Consumidor Final (FCF)</option>
              <option value="03">Comprobante Crédito Fiscal (CCF)</option>
              <option value="14">Factura Sujeto Excluido (FSE)</option>
            </select>
          </div>
        </div>

        {/* SECCIÓN 2 — Receptor */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Datos del receptor</h2>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Nombre */}
            <div className={requiereNIT ? '' : 'sm:col-span-2'}>
              <label htmlFor="receptor_nombre" className="label">
                Nombre{requiereNIT && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
              </label>
              <input
                id="receptor_nombre"
                type="text"
                placeholder={tipoDteActual === '01' ? 'Consumidor final (opcional)' : 'Razón social o nombre'}
                className={`input ${errors.receptor_nombre ? 'input-error' : ''}`}
                {...register('receptor_nombre')}
              />
              {errors.receptor_nombre && (
                <p className="error-msg" role="alert">{errors.receptor_nombre.message}</p>
              )}
            </div>

            {/* NIT */}
            {requiereNIT && (
              <div>
                <label htmlFor="receptor_nit" className="label">
                  NIT <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="receptor_nit"
                  type="text"
                  placeholder="0000-000000-000-0"
                  className={`input font-mono ${errors.receptor_nit ? 'input-error' : ''}`}
                  {...register('receptor_nit')}
                />
                {errors.receptor_nit && (
                  <p className="error-msg" role="alert">{errors.receptor_nit.message}</p>
                )}
              </div>
            )}

            {/* NRC */}
            {requiereNRC && (
              <div>
                <label htmlFor="receptor_nrc" className="label">
                  NRC <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="receptor_nrc"
                  type="text"
                  placeholder="000000-0"
                  className={`input font-mono ${errors.receptor_nrc ? 'input-error' : ''}`}
                  {...register('receptor_nrc')}
                />
                {errors.receptor_nrc && (
                  <p className="error-msg" role="alert">{errors.receptor_nrc.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECCIÓN 3 — Items */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Ítems</h2>
            <button
              type="button"
              onClick={() => append(itemVacio)}
              className="btn-secondary btn-sm"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Agregar ítem
            </button>
          </div>
          <div className="card-body space-y-3">
            {errors.items?.root && (
              <p className="error-msg" role="alert">{errors.items.root.message}</p>
            )}
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">

                {/* Descripción */}
                <div className="col-span-12 sm:col-span-5">
                  {idx === 0 && <label className="label text-xs">Descripción *</label>}
                  <input
                    type="text"
                    placeholder="Descripción del producto o servicio"
                    className={`input text-sm ${errors.items?.[idx]?.descripcion ? 'input-error' : ''}`}
                    {...register(`items.${idx}.descripcion`)}
                  />
                  {errors.items?.[idx]?.descripcion && (
                    <p className="error-msg">{errors.items[idx].descripcion.message}</p>
                  )}
                </div>

                {/* Cantidad */}
                <div className="col-span-4 sm:col-span-2">
                  {idx === 0 && <label className="label text-xs">Cantidad *</label>}
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.form.elements[
                          Array.from(e.target.form.elements).indexOf(e.target) + 1
                        ]?.focus();
                      }
                    }}
                    className={`input input-number text-sm text-right ${errors.items?.[idx]?.cantidad ? 'input-error' : ''}`}
                    {...register(`items.${idx}.cantidad`)}
                  />
                </div>

                {/* Precio */}
                <div className="col-span-4 sm:col-span-2">
                  {idx === 0 && <label className="label text-xs">Precio ($) *</label>}
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.form.elements[
                          Array.from(e.target.form.elements).indexOf(e.target) + 1
                        ]?.focus();
                      }
                    }}
                    className={`input input-number text-sm text-right ${errors.items?.[idx]?.precio_unitario ? 'input-error' : ''}`}
                    {...register(`items.${idx}.precio_unitario`)}
                  />
                </div>

                {/* Descuento % */}
                <div className="col-span-3 sm:col-span-2">
                  {idx === 0 && (
                    <label className="label text-xs">
                      Desc. (%)
                      <span
                        title="Porcentaje de descuento sobre el subtotal del ítem"
                        className="ml-1 text-gray-400 cursor-help"
                      >?</span>
                    </label>
                  )}
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="99.99"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const allInputs = Array.from(e.target.form.elements);
                          const idx_actual = allInputs.indexOf(e.target);
                          allInputs[idx_actual + 2]?.focus();
                        }
                      }}
                      className={`input input-number text-sm text-right pr-6 ${errors.items?.[idx]?.descuento_pct ? 'input-error' : ''}`}
                      {...register(`items.${idx}.descuento_pct`)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                  {errors.items?.[idx]?.descuento_pct && (
                    <p className="error-msg text-xs">{errors.items[idx].descuento_pct.message}</p>
                  )}
                </div>

                {/* Eliminar */}
                <div className={`col-span-1 flex ${idx === 0 ? 'mt-6' : ''}`}>
                  <button
                    type="button"
                    onClick={() => fields.length > 1 && remove(idx)}
                    disabled={fields.length === 1}
                    aria-label={`Eliminar ítem ${idx + 1}`}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN 4 — Totales */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Resumen</h2>
          </div>
          <div className="card-body">
            <div className="space-y-2 max-w-xs ml-auto">
              {/* Subtotal antes de descuentos */}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatMonto(totales.subtotal + totales.descuentoTotal)}</span>
              </div>

              {/* Descuento total si hay */}
              {totales.descuentoTotal > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span className="font-mono">- {formatMonto(totales.descuentoTotal)}</span>
                </div>
              )}

              {/* IVA */}
              {tipoDteActual !== '14' && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal gravado</span>
                  <span className="font-mono">{formatMonto(totales.totalGravado)}</span>
                </div>
              )}
              {tipoDteActual !== '14' && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>IVA (13%)</span>
                  <span className="font-mono">{formatMonto(totales.totalIva)}</span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total a pagar</span>
                <span className="font-mono">{formatMonto(totales.totalPagar)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 5 — Firma */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Firma electrónica</h2>
          </div>
          <div className="card-body">
            <label htmlFor="password_pri" className="label">
              Contraseña de firma (passwordPri){' '}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative max-w-sm">
              <input
                id="password_pri"
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña del certificado"
                autoComplete="off"
                className={`input pr-10 ${errors.password_pri ? 'input-error' : ''}`}
                {...register('password_pri')}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                  : <Eye    className="w-4 h-4" aria-hidden="true" />
                }
              </button>
            </div>
            {errors.password_pri && (
              <p className="error-msg" role="alert">{errors.password_pri.message}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              La contraseña no se almacena — se usa únicamente para firmar el documento.
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate('/dtes')}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Emitiendo...
              </>
            ) : (
              'Emitir DTE'
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default DTEEmitir;
