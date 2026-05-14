// src/components/usuarios/ModalUsuario.jsx
import { useEffect, useId, useState } from 'react';
import { useForm }     from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }           from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import Modal  from '../ui/Modal';
import Button from '../ui/Button';

const schemaNuevo = z.object({
  nombre:             z.string().min(3, 'Mínimo 3 caracteres.'),
  email:              z.string().email('Email inválido.'),
  password:           z.string().min(8, 'Mínimo 8 caracteres.')
                       .regex(/[A-Z]/, 'Debe tener al menos una mayúscula.')
                       .regex(/[0-9]/, 'Debe tener al menos un número.')
                       .regex(/[^A-Za-z0-9]/, 'Debe tener al menos un carácter especial.'),
  rol:                z.enum(['administrador', 'operador']),
  establecimiento_id: z.string().uuid('Selecciona un establecimiento.'),
});

const schemaEditar = z.object({
  nombre:             z.string().min(3, 'Mínimo 3 caracteres.'),
  email:              z.string().email('Email inválido.'),
  password:           z.string().min(8, 'Mínimo 8 caracteres.')
                       .regex(/[A-Z]/, 'Debe tener al menos una mayúscula.')
                       .regex(/[0-9]/, 'Debe tener al menos un número.')
                       .regex(/[^A-Za-z0-9]/, 'Debe tener al menos un carácter especial.')
                       .optional().or(z.literal('')),
  rol:                z.enum(['administrador', 'operador']),
  establecimiento_id: z.string().uuid('Selecciona un establecimiento.'),
});

const ModalUsuario = ({ isOpen, onClose, onGuardar, usuario = null, establecimientos = [] }) => {
  const modoEdicion = !!usuario;
  const formId      = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [errorApi,     setErrorApi]     = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isValid } } = useForm({
    resolver: zodResolver(modoEdicion ? schemaEditar : schemaNuevo),
    mode: 'onChange',
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
      });
    }
  }, [isOpen, usuario, reset]);

  const onSubmit = async (datos) => {
    setErrorApi('');
    const payload = { ...datos };
    // En edición: no enviar password si está vacío
    if (modoEdicion && !payload.password?.trim()) {
      delete payload.password;
    }
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

        {/* Nombre */}
        <div>
          <label htmlFor={`${formId}-nombre`} className="label">
            Nombre <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input id={`${formId}-nombre`} type="text"
            className={`input ${errors.nombre ? 'input-error' : ''}`}
            {...register('nombre')} />
          {errors.nombre && <p className="error-msg" role="alert">{errors.nombre.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor={`${formId}-email`} className="label">
            Email <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input id={`${formId}-email`} type="email"
            className={`input ${errors.email ? 'input-error' : ''}`}
            {...register('email')} />
          {errors.email && <p className="error-msg" role="alert">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor={`${formId}-pwd`} className="label">
            Contraseña{modoEdicion && <span className="text-gray-400 font-normal ml-1">(dejar vacío para no cambiar)</span>}
            {!modoEdicion && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
          <div className="relative">
            <input id={`${formId}-pwd`}
              type={showPassword ? 'text' : 'password'}
              autoComplete={modoEdicion ? 'new-password' : 'new-password'}
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
          {!modoEdicion && (
            <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres, una mayúscula, un número y un carácter especial.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Rol */}
          <div>
            <label htmlFor={`${formId}-rol`} className="label">
              Rol <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select id={`${formId}-rol`} className="input" {...register('rol')}>
              <option value="operador">Operador</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>

          {/* Establecimiento */}
          <div>
            <label htmlFor={`${formId}-estable`} className="label">
              Establecimiento <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select id={`${formId}-estable`}
              className={`input ${errors.establecimiento_id ? 'input-error' : ''}`}
              {...register('establecimiento_id')}>
              <option value="">Seleccionar...</option>
              {establecimientos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} ({e.cod_estable_mh})
                </option>
              ))}
            </select>
            {errors.establecimiento_id && <p className="error-msg" role="alert">{errors.establecimiento_id.message}</p>}
          </div>
        </div>

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
