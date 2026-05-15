// src/components/clientes/ModalCliente.jsx
// Modal crear/editar cliente
// Schema cambia dinámicamente según tipo_cliente
// Campos jurídicos: NIT+NRC+actividad obligatorios (Hacienda)

import { useEffect, useId, useState } from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { Loader2 }     from 'lucide-react';
import Modal  from '../ui/Modal';
import Button from '../ui/Button';

const TIPOS_DOC = [
  { value: '13', label: 'DUI' },
  { value: '36', label: 'NIT' },
  { value: '03', label: 'Pasaporte' },
  { value: '02', label: 'Carnet de residente' },
  { value: '37', label: 'Otro' },
];

const DEPARTAMENTOS = [
  { cod: '01', nombre: 'Ahuachapán' },
  { cod: '02', nombre: 'Santa Ana' },
  { cod: '03', nombre: 'Sonsonate' },
  { cod: '04', nombre: 'Chalatenango' },
  { cod: '05', nombre: 'La Libertad' },
  { cod: '06', nombre: 'San Salvador' },
  { cod: '07', nombre: 'Cuscatlán' },
  { cod: '08', nombre: 'La Paz' },
  { cod: '09', nombre: 'Cabañas' },
  { cod: '10', nombre: 'San Vicente' },
  { cod: '11', nombre: 'Usulután' },
  { cod: '12', nombre: 'San Miguel' },
  { cod: '13', nombre: 'Morazán' },
  { cod: '14', nombre: 'La Unión' },
];

const schema = z.object({
  tipo_cliente:     z.enum(['natural', 'juridico']),
  nombre:           z.string().min(1, 'El nombre es requerido.').max(250),
  nombre_comercial: z.string().max(150).optional().or(z.literal('')),
  tipo_documento:   z.string().optional().nullable(),
  num_documento:    z.string().max(30).optional().or(z.literal('')),
  nit:              z.string().optional().or(z.literal('')),
  nrc:              z.string().optional().or(z.literal('')),
  cod_actividad:    z.string().optional().or(z.literal('')),
  desc_actividad:   z.string().optional().or(z.literal('')),
  departamento_cod: z.string().optional().nullable(),
  municipio_cod:    z.string().optional().or(z.literal('')),
  direccion:        z.string().max(250).optional().or(z.literal('')),
  telefono:         z.string().optional().or(z.literal('')),
  correo:           z.string().email('Email inválido.').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const nitRegex = /^\d{4}-\d{6}-\d{3}-\d{1}$/;
  const nrcRegex = /^\d{1,7}(-\d)?$/;

  if (data.tipo_cliente === 'juridico') {
    if (!data.nit?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'El NIT es obligatorio para clientes jurídicos.', path: ['nit'] });
    } else if (!nitRegex.test(data.nit.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Formato requerido: 0000-000000-000-0', path: ['nit'] });
    }
    if (!data.nrc?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'El NRC es obligatorio. Hacienda lo exige en CCF.', path: ['nrc'] });
    } else if (!nrcRegex.test(data.nrc.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'Formato: 0000000 o 0000000-0', path: ['nrc'] });
    }
    if (!data.cod_actividad?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'El código de actividad es obligatorio.', path: ['cod_actividad'] });
    }
    if (!data.desc_actividad?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom,
        message: 'La descripción de actividad es obligatoria.', path: ['desc_actividad'] });
    }
  }
  if (data.tipo_cliente === 'natural' && data.num_documento?.trim() && !data.tipo_documento) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: 'Selecciona el tipo de documento.', path: ['tipo_documento'] });
  }
  if (data.municipio_cod?.trim() && !data.departamento_cod) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: 'Selecciona el departamento primero.', path: ['municipio_cod'] });
  }
});

const Field = ({ id, label, req, error, children, note }) => (
  <div>
    <label htmlFor={id} className="label">
      {label}{req && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
    </label>
    {children}
    {error && <p className="error-msg" role="alert">{error}</p>}
    {note && !error && <p className="text-xs text-gray-400 mt-1">{note}</p>}
  </div>
);

const ModalCliente = ({ isOpen, onClose, onGuardar, cliente = null }) => {
  const modoEdicion  = !!cliente;
  const formId       = useId();
  const [errorApi, setErrorApi] = useState('');

  const { register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode:     'onChange',
  });

  const tipoCliente     = watch('tipo_cliente');
  const numDocumento    = watch('num_documento');
  const departamentoCod = watch('departamento_cod');
  const esJuridico      = tipoCliente === 'juridico';
  const esNatural       = tipoCliente === 'natural';

  // Limpiar municipio si se cambia departamento
  useEffect(() => {
    if (!departamentoCod) setValue('municipio_cod', '');
  }, [departamentoCod, setValue]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorApi('');
    reset({
      tipo_cliente:     cliente?.tipo_cliente     ?? 'natural',
      nombre:           cliente?.nombre           ?? '',
      nombre_comercial: cliente?.nombre_comercial ?? '',
      tipo_documento:   cliente?.tipo_documento   ?? null,
      num_documento:    cliente?.num_documento    ?? '',
      nit:              cliente?.nit              ?? '',
      nrc:              cliente?.nrc              ?? '',
      cod_actividad:    cliente?.cod_actividad    ?? '',
      desc_actividad:   cliente?.desc_actividad   ?? '',
      departamento_cod: cliente?.departamento_cod ?? null,
      municipio_cod:    cliente?.municipio_cod    ?? '',
      direccion:        cliente?.direccion        ?? '',
      telefono:         cliente?.telefono         ?? '',
      correo:           cliente?.correo           ?? '',
    });
  }, [isOpen, cliente, reset]);

  const onSubmit = async (datos) => {
    setErrorApi('');
    const payload = { ...datos };
    // Limpiar campos del tipo contrario
    if (payload.tipo_cliente === 'natural') {
      payload.nit = null; payload.nrc = null;
      payload.cod_actividad = null; payload.desc_actividad = null;
    }
    if (payload.tipo_cliente === 'juridico') {
      payload.tipo_documento = null; payload.num_documento = null;
    }
    // Strings vacíos → null
    for (const k of Object.keys(payload)) {
      if (payload[k] === '') payload[k] = null;
    }
    try {
      await onGuardar(payload);
      onClose();
    } catch (err) {
      setErrorApi(err.response?.data?.mensaje || 'No se pudo guardar el cliente.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={modoEdicion ? 'Editar cliente' : 'Nuevo cliente'}
      size="fullscreen">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {errorApi && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600" role="alert">{errorApi}</p>
          </div>
        )}

        {/* Tipo */}
        <div>
          <p className="label mb-2">
            Tipo de cliente <span className="text-red-500" aria-hidden="true">*</span>
          </p>
          <div className="flex gap-3">
            {[
              { v: 'natural',  l: 'Persona natural' },
              { v: 'juridico', l: 'Persona jurídica (empresa)' },
            ].map(({ v, l }) => (
              <label key={v}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors flex-1 ${
                  tipoCliente === v
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}>
                <input type="radio" value={v} className="accent-primary-600"
                  {...register('tipo_cliente')} />
                <span className="text-sm font-medium">{l}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Nombre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field id={`${formId}-nombre`} label="Nombre / razón social" req
            error={errors.nombre?.message}>
            <input id={`${formId}-nombre`} type="text"
              className={`input ${errors.nombre ? 'input-error' : ''}`}
              placeholder="Nombre completo o razón social"
              {...register('nombre')} />
          </Field>
          <Field id={`${formId}-comercial`} label="Nombre comercial">
            <input id={`${formId}-comercial`} type="text" className="input"
              placeholder="Opcional"
              {...register('nombre_comercial')} />
          </Field>
        </div>

        {/* ── PERSONA NATURAL ── */}
        <div className="rounded-lg border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Identificación — Persona natural
            {esJuridico && <span className="ml-2 font-normal text-gray-300">no aplica</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id={`${formId}-tipodoc`}
              label="Tipo de documento"
              req={esNatural && !!numDocumento?.trim()}
              error={errors.tipo_documento?.message}>
              <select id={`${formId}-tipodoc`} className="input"
                disabled={esJuridico}
                {...register('tipo_documento')}>
                <option value="">Seleccionar...</option>
                {TIPOS_DOC.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>
            <Field id={`${formId}-numdoc`} label="Número de documento"
              error={errors.num_documento?.message}>
              <input id={`${formId}-numdoc`} type="text"
                className="input font-mono"
                placeholder="00000000-0"
                disabled={esJuridico}
                {...register('num_documento')} />
            </Field>
          </div>
        </div>

        {/* ── PERSONA JURÍDICA ── */}
        <div className="rounded-lg border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Identificación fiscal — Persona jurídica
            {esNatural && <span className="ml-2 font-normal text-gray-300">no aplica</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id={`${formId}-nit`} label="NIT" req={esJuridico}
              error={errors.nit?.message}>
              <input id={`${formId}-nit`} type="text"
                className={`input font-mono ${errors.nit ? 'input-error' : ''}`}
                placeholder="0000-000000-000-0"
                disabled={esNatural}
                {...register('nit')} />
            </Field>
            <Field id={`${formId}-nrc`}
              label="NRC" req={esJuridico}
              error={errors.nrc?.message}
              note="Requerido por Hacienda para emitir CCF">
              <input id={`${formId}-nrc`} type="text"
                className={`input font-mono ${errors.nrc ? 'input-error' : ''}`}
                placeholder="000000-0"
                disabled={esNatural}
                {...register('nrc')} />
            </Field>
            <Field id={`${formId}-codact`}
              label="Código de actividad económica" req={esJuridico}
              error={errors.cod_actividad?.message}>
              <input id={`${formId}-codact`} type="text"
                className={`input font-mono ${errors.cod_actividad ? 'input-error' : ''}`}
                placeholder="00000"
                disabled={esNatural}
                {...register('cod_actividad')} />
            </Field>
            <Field id={`${formId}-descact`}
              label="Descripción de actividad" req={esJuridico}
              error={errors.desc_actividad?.message}>
              <input id={`${formId}-descact`} type="text"
                className={`input ${errors.desc_actividad ? 'input-error' : ''}`}
                placeholder="Ej: Venta al por mayor de alimentos..."
                disabled={esNatural}
                {...register('desc_actividad')} />
            </Field>
          </div>
        </div>

        {/* ── DIRECCIÓN ── */}
        <div className="rounded-lg border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Dirección
            <span className="ml-2 font-normal text-gray-400 normal-case">
              {esJuridico ? 'recomendada para CCF' : 'opcional'}
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id={`${formId}-depto`} label="Departamento"
              error={errors.departamento_cod?.message}>
              <select id={`${formId}-depto`} className="input"
                {...register('departamento_cod')}>
                <option value="">Seleccionar...</option>
                {DEPARTAMENTOS.map(d => (
                  <option key={d.cod} value={d.cod}>{d.nombre}</option>
                ))}
              </select>
            </Field>
            <Field id={`${formId}-muni`}
              label="Código de municipio (CAT-013)"
              error={errors.municipio_cod?.message}
              note={!departamentoCod ? 'Selecciona el departamento primero' : ''}>
              <input id={`${formId}-muni`} type="text"
                className={`input font-mono ${errors.municipio_cod ? 'input-error' : ''}`}
                placeholder="Ej: 23"
                disabled={!departamentoCod}
                {...register('municipio_cod')} />
            </Field>
            <div className="sm:col-span-2">
              <Field id={`${formId}-dir`} label="Dirección (complemento)">
                <input id={`${formId}-dir`} type="text" className="input"
                  placeholder="Calle, colonia, número de casa..."
                  {...register('direccion')} />
              </Field>
            </div>
          </div>
        </div>

        {/* ── CONTACTO ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field id={`${formId}-tel`} label="Teléfono">
            <input id={`${formId}-tel`} type="text" className="input"
              placeholder="00000000" {...register('telefono')} />
          </Field>
          <Field id={`${formId}-correo`} label="Correo electrónico"
            error={errors.correo?.message}>
            <input id={`${formId}-correo`} type="email"
              className={`input ${errors.correo ? 'input-error' : ''}`}
              placeholder="correo@empresa.com"
              {...register('correo')} />
          </Field>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {modoEdicion ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalCliente;
