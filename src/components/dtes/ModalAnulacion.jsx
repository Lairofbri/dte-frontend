// src/components/dtes/ModalAnulacion.jsx
// Modal para anulación de DTE — schema v3 de invalidación Hacienda
// passwordPri NUNCA se guarda en estado persistente — solo local en el modal

import { useEffect, useId, useState } from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Modal  from '../ui/Modal';
import Button from '../ui/Button';

// ─────────────────────────────────────────────
// CATÁLOGOS MH
// ─────────────────────────────────────────────

const MOTIVO_TIPO = [
  { value: '',  label: 'Selecciona un motivo' },
  { value: '1', label: 'Error en la información del DTE' },
  { value: '2', label: 'Rescindir la operación' },
  { value: '3', label: 'Otro' },
];

const TIPO_DOCUMENTO = [
  { value: '',  label: 'Selecciona tipo de documento' },
  { value: '36', label: 'NIT' },
  { value: '13', label: 'DUI' },
  { value: '02', label: 'Carnet de Residente' },
  { value: '03', label: 'Pasaporte' },
  { value: '37', label: 'Otro' },
];

// ─────────────────────────────────────────────
// SCHEMA DE VALIDACIÓN (v3 invalidation)
// ─────────────────────────────────────────────

const schema = z.object({
  motivo_tipo:          z.string().min(1, 'Selecciona un motivo.'),
  motivo_descripcion:   z.string()
    .min(5, 'Mínimo 5 caracteres.')
    .max(250, 'Máximo 250 caracteres.'),
  nombre_responsable:   z.string()
    .min(1, 'El nombre del responsable es requerido.')
    .max(100, 'Máximo 100 caracteres.'),
  tipo_doc_responsable: z.string().min(1, 'Selecciona un tipo de documento.'),
  num_doc_responsable:  z.string()
    .min(3, 'Mínimo 3 caracteres.')
    .max(25, 'Máximo 25 caracteres.'),
  nombre_solicita:      z.string().max(100, 'Máximo 100 caracteres.').optional().or(z.literal('')),
  tipo_doc_solicita:    z.string().optional().or(z.literal('')),
  num_doc_solicita:     z.string().max(25, 'Máximo 25 caracteres.').optional().or(z.literal('')),
  password_pri:         z.string().min(1, 'La contraseña de firma es requerida.'),
}).superRefine((data, ctx) => {
  // Si se llena alguno de los campos de solicita, los tres son requeridos
  const tieneSolicita = data.nombre_solicita || data.tipo_doc_solicita || data.num_doc_solicita;
  if (tieneSolicita) {
    if (!data.nombre_solicita) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nombre requerido.', path: ['nombre_solicita'] });
    }
    if (!data.tipo_doc_solicita) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tipo de documento requerido.', path: ['tipo_doc_solicita'] });
    }
    if (!data.num_doc_solicita || data.num_doc_solicita.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mínimo 3 caracteres.', path: ['num_doc_solicita'] });
    }
  }
});

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────

const ModalAnulacion = ({ isOpen, onClose, onConfirmar, anulando, numeroDTE }) => {
  const formId = useId();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode:     'onChange',
  });

  const tipoDocResp  = watch('tipo_doc_responsable');
  const tieneSolicita = watch('nombre_solicita') || watch('tipo_doc_solicita') || watch('num_doc_solicita');

  const limpiarYCerrar = () => {
    setShowPassword(false);
    reset();
    onClose();
  };

  const onSubmit = async (datos) => {
    try {
      const payload = {
        motivo_tipo:            Number(datos.motivo_tipo),
        motivo_descripcion:     datos.motivo_descripcion,
        nombre_responsable:     datos.nombre_responsable,
        tipo_doc_responsable:   datos.tipo_doc_responsable,
        num_doc_responsable:    datos.num_doc_responsable,
        password_pri:           datos.password_pri,
      };

      if (datos.nombre_solicita) {
        payload.nombre_solicita    = datos.nombre_solicita;
        payload.tipo_doc_solicita  = datos.tipo_doc_solicita;
        payload.num_doc_solicita   = datos.num_doc_solicita;
      }

      await onConfirmar(payload);
      setShowPassword(false);
      reset();
    } catch {
      reset((v) => ({ ...v, password_pri: '' }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      setShowPassword(false);
      reset({
        motivo_tipo:          '',
        motivo_descripcion:   '',
        nombre_responsable:   '',
        tipo_doc_responsable: '',
        num_doc_responsable:  '',
        nombre_solicita:      '',
        tipo_doc_solicita:    '',
        num_doc_solicita:     '',
        password_pri:         '',
      });
    }
  }, [isOpen, reset]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={limpiarYCerrar}
      title="Anular DTE"
      size="lg"
      id={formId}
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {/* Advertencia */}
        <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-red-700">Esta acción es irreversible</p>
            <p className="text-xs text-red-600 mt-0.5">
              El DTE <span className="font-mono font-medium">{numeroDTE}</span> será
              anulado ante el Ministerio de Hacienda.
            </p>
          </div>
        </div>

        {/* ── MOTIVO ── */}

        {/* Tipo de motivo */}
        <div>
          <label htmlFor={`${formId}-motivo-tipo`} className="label">
            Tipo de motivo <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id={`${formId}-motivo-tipo`}
            className={`input ${errors.motivo_tipo ? 'input-error' : ''}`}
            {...register('motivo_tipo')}
          >
            {MOTIVO_TIPO.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {errors.motivo_tipo && (
            <p className="error-msg" role="alert">{errors.motivo_tipo.message}</p>
          )}
        </div>

        {/* Descripción del motivo */}
        <div>
          <label htmlFor={`${formId}-motivo-desc`} className="label">
            Descripción del motivo <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id={`${formId}-motivo-desc`}
            rows={2}
            className={`input resize-none ${errors.motivo_descripcion ? 'input-error' : ''}`}
            placeholder="Describe el motivo de la anulación (5-250 caracteres)..."
            {...register('motivo_descripcion')}
          />
          {errors.motivo_descripcion && (
            <p className="error-msg" role="alert">{errors.motivo_descripcion.message}</p>
          )}
        </div>

        {/* ── RESPONSABLE ── */}

        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-semibold text-gray-700 px-1">Responsable de la anulación</legend>

          <div className="space-y-3">
            <div>
              <label htmlFor={`${formId}-nombre-resp`} className="label">
                Nombre <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id={`${formId}-nombre-resp`}
                type="text"
                className={`input ${errors.nombre_responsable ? 'input-error' : ''}`}
                placeholder="Nombre completo del responsable"
                {...register('nombre_responsable')}
              />
              {errors.nombre_responsable && (
                <p className="error-msg" role="alert">{errors.nombre_responsable.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${formId}-tipo-doc-resp`} className="label">
                  Tipo de documento <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <select
                  id={`${formId}-tipo-doc-resp`}
                  className={`input ${errors.tipo_doc_responsable ? 'input-error' : ''}`}
                  {...register('tipo_doc_responsable')}
                >
                  {TIPO_DOCUMENTO.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {errors.tipo_doc_responsable && (
                  <p className="error-msg" role="alert">{errors.tipo_doc_responsable.message}</p>
                )}
              </div>

              <div>
                <label htmlFor={`${formId}-num-doc-resp`} className="label">
                  Número de documento <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id={`${formId}-num-doc-resp`}
                  type="text"
                  className={`input ${errors.num_doc_responsable ? 'input-error' : ''}`}
                  placeholder={tipoDocResp === '36' ? '0614-010101-001-5' : '00000000-0'}
                  {...register('num_doc_responsable')}
                />
                {errors.num_doc_responsable && (
                  <p className="error-msg" role="alert">{errors.num_doc_responsable.message}</p>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        {/* ── SOLICITA (opcional) ── */}

        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-semibold text-gray-700 px-1">
            Solicitante <span className="text-xs text-gray-400 font-normal">(opcional)</span>
          </legend>

          <div className="space-y-3">
            <div>
              <label htmlFor={`${formId}-nombre-sol`} className="label">
                Nombre del solicitante
              </label>
              <input
                id={`${formId}-nombre-sol`}
                type="text"
                className={`input ${errors.nombre_solicita ? 'input-error' : ''}`}
                placeholder="Nombre de quien solicita la anulación"
                {...register('nombre_solicita')}
              />
              {errors.nombre_solicita && (
                <p className="error-msg" role="alert">{errors.nombre_solicita.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${formId}-tipo-doc-sol`} className="label">
                  Tipo de documento
                </label>
                <select
                  id={`${formId}-tipo-doc-sol`}
                  className={`input ${errors.tipo_doc_solicita ? 'input-error' : ''} ${!tieneSolicita ? 'text-gray-400' : ''}`}
                  {...register('tipo_doc_solicita')}
                >
                  {TIPO_DOCUMENTO.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {errors.tipo_doc_solicita && (
                  <p className="error-msg" role="alert">{errors.tipo_doc_solicita.message}</p>
                )}
              </div>

              <div>
                <label htmlFor={`${formId}-num-doc-sol`} className="label">
                  Número de documento
                </label>
                <input
                  id={`${formId}-num-doc-sol`}
                  type="text"
                  className={`input ${errors.num_doc_solicita ? 'input-error' : ''}`}
                  placeholder="Número de documento"
                  {...register('num_doc_solicita')}
                />
                {errors.num_doc_solicita && (
                  <p className="error-msg" role="alert">{errors.num_doc_solicita.message}</p>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        {/* ── PASSWORD ── */}

        <div>
          <label htmlFor={`${formId}-password`} className="label">
            Contraseña de firma (passwordPri) <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <input
              id={`${formId}-password`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              className={`input pr-10 ${errors.password_pri ? 'input-error' : ''}`}
              placeholder="Contraseña del certificado"
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
        </div>

        {/* ── ACCIONES ── */}

        <div className="flex gap-3 justify-end pt-2">
          <Button
            variant="secondary"
            onClick={limpiarYCerrar}
            disabled={isSubmitting || anulando}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={isSubmitting || anulando}
          >
            Confirmar anulación
          </Button>
        </div>

      </form>
    </Modal>
  );
};

export default ModalAnulacion;
