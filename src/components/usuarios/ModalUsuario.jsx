// src/components/usuarios/ModalUsuario.jsx
// Fix CUBIC: resolver fijo — no condicional por modoEdicion
// El password es opcional en ambos modos — la validación de requerido
// se hace con refine según si es edición o no

import { useEffect, useId, useState } from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import Modal  from '../ui/Modal';
import Button from '../ui/Button';

// Schema único — password opcional en edición, requerido en creación
// Se controla con el campo oculto modoEdicion
const schema = z.object({
  nombre:             z.string().min(3, 'Mínimo 3 caracteres.'),
  email:              z.string().email('Email inválido.'),
  password:           z.string().optional().or(z.literal('')),
  rol:                z.enum(['administrador', 'operador']),
  establecimiento_id: z.string().uuid('Selecciona un establecimiento.'),
  _esNuevo:           z.boolean(),
}).superRefine((data, ctx) => {
  // Solo validar complejidad del password si se proporcionó
  if (data.password && data.password.length > 0) {
    if (data.password.length < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mínimo 8 caracteres.', path: ['password'] });
    }
    if (!/[A-Z]/.test(data.password)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe tener al menos una mayúscula.', path: ['password'] });
    }
    if (!/[0-9]/.test(data.password)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe tener al menos un número.', path: ['password'] });
    }
    if (!/[^A-Za-z0-9]/.test(data.password)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe tener al menos un carácter especial.', path: ['password'] });
    }
  } else if (data._esNuevo) {
    // En creación el password es obligatorio
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La contraseña es requerida.', path: ['password'] });
  }
});

const ModalUsuario = ({ isOpen, onClose, onGuardar, usuario = null, establecimientos = [] }) => {
  const modoEdicion = !!usuario;
  const formId      = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [errorApi,     setErrorApi]     = useState('');

  // Resolver siempre el mismo schema — sin condicional
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isValid } } = useForm({
    resolver: zodResolver(schema),
    mode:     'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      setShowPassword(false);
      setErrorApi('');
      reset({
        nombre:             usuario?.nombre             ?? '',
        email:              usuario?.email              ?? '',
        password:           '',
        rol:                usuario?.rol               ?? 'operador',
        establecimiento_id: usuario?.establecimiento_id ?? '',
        _esNuevo:           !modoEdicion,
      });
    }
  }, [isOpen, usuario, modoEdicion, reset]);

  const onSubmit = async (datos) => {
    setErrorApi('');
    const { _esNuevo, ...payload } = datos;
    if (modoEdicion && !payload.password?.trim()) delete payload.password;
    try {
      await onGuardar(payload);
      onClose();
    } catch (err) {
      setErrorApi(err.response?.data?.mensaje || 'No se pudo guardar. Intenta de nuevo.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modoEdicion ? 'Editar usuario' : 'Nuevo usuario'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {errorApi && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600" role="alert">{errorApi}</p>
          </div>
        )}

        <div>
          <label htmlFor={`${formId}-nombre`} className="label">
            Nombre <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input id={`${formId}-nombre`} type="text"
            className={`input ${errors.nombre ? 'input-error' : ''}`}
            {...register('nombre')} />
          {errors.nombre && <p className="error-msg" role="alert">{errors.nombre.message}</p>}
        </div>

        <div>
          <label htmlFor={`${formId}-email`} className="label">
            Email <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input id={`${formId}-email`} type="email"
            className={`input ${errors.email ? 'input-error' : ''}`}
            {...register('email')} />
          {errors.email && <p className="error-msg" role="alert">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor={`${formId}-pwd`} className="label">
            Contraseña
            {modoEdicion
              ? <span className="text-gray-400 font-normal ml-1">(dejar vacío para no cambiar)</span>
              : <span className="text-red-500 ml-1" aria-hidden="true">*</span>
            }
          </label>
          <div className="relative">
            <input id={`${formId}-pwd`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
              {...register('password')} />
            <button type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p className="error-msg" role="alert">{errors.password.message}</p>}
          {!modoEdicion && <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres, una mayúscula, un número y un carácter especial.</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${formId}-rol`} className="label">
              Rol <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select id={`${formId}-rol`} className="input" {...register('rol')}>
              <option value="operador">Operador</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${formId}-estable`} className="label">
              Establecimiento <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select id={`${formId}-estable`}
              className={`input ${errors.establecimiento_id ? 'input-error' : ''}`}
              {...register('establecimiento_id')}>
              <option value="">Seleccionar...</option>
              {establecimientos.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre} ({e.cod_estable_mh})</option>
              ))}
            </select>
            {errors.establecimiento_id && <p className="error-msg" role="alert">{errors.establecimiento_id.message}</p>}
          </div>
        </div>

        {/* Campo oculto para el modo */}
        <input type="hidden" {...register('_esNuevo')} />

        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!isValid}>
            {modoEdicion ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalUsuario;
