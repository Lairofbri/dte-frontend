// src/pages/Configuracion.jsx
// Configuración del emisor — solo administradores
// Permite editar datos del emisor y credenciales de Hacienda

import { useState, useEffect }    from 'react';
import { useForm }                 from 'react-hook-form';
import { zodResolver }             from '@hookform/resolvers/zod';
import { z }                       from 'zod';
import { toast }                   from 'react-hot-toast';
import {
  Save, RefreshCw, CheckCircle,
  XCircle, Loader2, Eye, EyeOff,
  AlertTriangle, Wifi,
} from 'lucide-react';
import {
  obtenerConfiguracionApi,
  actualizarConfiguracionApi,
  testFirmadorApi,
} from '../api/configuracion.api';
import Spinner from '../components/ui/Spinner';
import Button  from '../components/ui/Button';

// ─────────────────────────────────────────────
// SCHEMA DE VALIDACIÓN
// ─────────────────────────────────────────────
const configuracionSchema = z.object({
  nombre:           z.string().min(1, 'El nombre es requerido.'),
  nombre_comercial: z.string().optional(),
  nit:              z.string()
                     .min(1, 'El NIT es requerido.')
                     .regex(/^\d{4}-\d{6}-\d{3}-\d$/, 'Formato: 0000-000000-000-0'),
  nrc:              z.string()
                     .min(1, 'El NRC es requerido.')
                     .regex(/^\d+-\d$/, 'Formato: 000000-0'),
  direccion:        z.string().min(1, 'La dirección es requerida.'),
  telefono:         z.string().optional(),
  email:            z.string().email('Email inválido.').optional().or(z.literal('')),
  codigo_actividad: z.string().min(1, 'El código de actividad es requerido.'),
  tipo_establecimiento: z.string().min(1, 'El tipo de establecimiento es requerido.'),
  usuario_hacienda: z.string().optional(),
  password_hacienda: z.string().optional(),
});

// ─────────────────────────────────────────────
// SUBCOMPONENTES
// ─────────────────────────────────────────────
const EstadoConexion = ({ estado }) => {
  if (estado === null) return null;
  if (estado === 'probando') return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
      Probando...
    </span>
  );
  if (estado === 'ok') return (
    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
      <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
      Conexión exitosa
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
      Sin conexión
    </span>
  );
};

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const Configuracion = () => {
  const [isLoading,      setIsLoading]      = useState(true);
  const [isSaving,       setIsSaving]       = useState(false);
  const [showPassword,   setShowPassword]   = useState(false);
  const [estadoFirmador, setEstadoFirmador] = useState(null);
  const [esProduccion,   setEsProduccion]   = useState(false);
  const [error,          setError]          = useState(null);

  // Todos los hooks ANTES de returns condicionales
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(configuracionSchema),
  });

  // ── Cargar configuración al montar ──
  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const config = await obtenerConfiguracionApi();
        if (!cancelado) {
          reset({
            nombre:               config.nombre               ?? '',
            nombre_comercial:     config.nombre_comercial     ?? '',
            nit:                  config.nit                  ?? '',
            nrc:                  config.nrc                  ?? '',
            direccion:            config.direccion            ?? '',
            telefono:             config.telefono             ?? '',
            email:                config.email               ?? '',
            correo:               config.correo              ?? '',
            codigo_actividad:     config.codigo_actividad     ?? '',
            desc_actividad:       config.desc_actividad       ?? '',
            tipo_establecimiento: config.tipo_establecimiento ?? '02',
            usuario_hacienda:     config.usuario_hacienda ?? '',
            password_hacienda:    '',  // NUNCA pre-rellenar — el backend no lo devuelve
          });
          setEsProduccion(config.ambiente === '01');
        }
      } catch (err) {
        if (!cancelado) setError('No se pudo cargar la configuración.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };

    cargar();
    return () => { cancelado = true; };
  }, [reset]);

  // ── Guardar configuración ──
  const onSubmit = async (datos) => {
    setIsSaving(true);
    try {
      // No enviar password si está vacío — significa que no se cambió
      const payload = { ...datos };
      if (!payload.password_hacienda?.trim()) {
        delete payload.password_hacienda;
      }
      await actualizarConfiguracionApi(payload);
      toast.success('Configuración guardada correctamente.');
      // Limpiar password después de guardar — NUNCA dejarlo visible en el formulario
      reset({ ...datos, password_hacienda: '' });
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || 'No se pudo guardar la configuración.';
      toast.error(mensaje);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Test firmador ──
  const probarFirmador = async () => {
    setEstadoFirmador('probando');
    try {
      await testFirmadorApi();
      setEstadoFirmador('ok');
    } catch (_) {
      setEstadoFirmador('error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" aria-hidden="true" />
        <p className="text-gray-500 mb-4" role="alert">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">

      {/* Advertencia de producción */}
      {esProduccion && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-300 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-red-700">Ambiente de PRODUCCIÓN</p>
            <p className="text-xs text-red-600 mt-0.5">
              Los DTEs emitidos tienen validez legal ante el Ministerio de Hacienda.
              Cualquier cambio en la configuración afecta documentos reales.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* SECCIÓN 1 — Datos del emisor */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Datos del emisor</h2>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2">
              <label htmlFor="nombre" className="label">
                Nombre / Razón social <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="nombre"
                type="text"
                className={`input ${errors.nombre ? 'input-error' : ''}`}
                {...register('nombre')}
              />
              {errors.nombre && <p className="error-msg" role="alert">{errors.nombre.message}</p>}
            </div>

            <div>
              <label htmlFor="nombre_comercial" className="label">Nombre comercial</label>
              <input id="nombre_comercial" type="text" className="input" {...register('nombre_comercial')} />
            </div>

            <div>
              <label htmlFor="nit" className="label">
                NIT <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="nit"
                type="text"
                placeholder="0000-000000-000-0"
                className={`input font-mono ${errors.nit ? 'input-error' : ''}`}
                {...register('nit')}
              />
              {errors.nit && <p className="error-msg" role="alert">{errors.nit.message}</p>}
            </div>

            <div>
              <label htmlFor="nrc" className="label">
                NRC <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="nrc"
                type="text"
                placeholder="000000-0"
                className={`input font-mono ${errors.nrc ? 'input-error' : ''}`}
                {...register('nrc')}
              />
              {errors.nrc && <p className="error-msg" role="alert">{errors.nrc.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="direccion" className="label">
                Dirección <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="direccion"
                type="text"
                className={`input ${errors.direccion ? 'input-error' : ''}`}
                {...register('direccion')}
              />
              {errors.direccion && <p className="error-msg" role="alert">{errors.direccion.message}</p>}
            </div>

            <div>
              <label htmlFor="telefono" className="label">Teléfono</label>
              <input id="telefono" type="text" placeholder="0000-0000" className="input" {...register('telefono')} />
            </div>

            <div>
              <label htmlFor="email" className="label">Email interno</label>
              <input
                id="email"
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="error-msg" role="alert">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="correo" className="label">
                Correo (Hacienda) <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="correo"
                type="email"
                className={`input ${errors.correo ? 'input-error' : ''}`}
                placeholder="correo@empresa.com"
                {...register('correo')}
              />
              {errors.correo && <p className="error-msg" role="alert">{errors.correo.message}</p>}
              <p className="text-xs text-gray-400 mt-1">
                Este correo aparece en el JSON del DTE enviado a Hacienda
              </p>
            </div>

            <div>
              <label htmlFor="codigo_actividad" className="label">
                Código de actividad <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="codigo_actividad"
                type="text"
                placeholder="00000"
                className={`input font-mono ${errors.codigo_actividad ? 'input-error' : ''}`}
                {...register('codigo_actividad')}
              />
              {errors.codigo_actividad && <p className="error-msg" role="alert">{errors.codigo_actividad.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="desc_actividad" className="label">
                Descripción de actividad económica <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="desc_actividad"
                type="text"
                placeholder="Ej: Venta al por menor de alimentos y bebidas"
                className={`input ${errors.desc_actividad ? 'input-error' : ''}`}
                {...register('desc_actividad')}
              />
              {errors.desc_actividad && <p className="error-msg" role="alert">{errors.desc_actividad.message}</p>}
              <p className="text-xs text-gray-400 mt-1">
                Aparece como descActividad en el emisor del JSON de Hacienda
              </p>
            </div>

            <div>
              <label htmlFor="tipo_establecimiento" className="label">
                Tipo de establecimiento <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <select
                id="tipo_establecimiento"
                className={`input ${errors.tipo_establecimiento ? 'input-error' : ''}`}
                {...register('tipo_establecimiento')}
              >
                <option value="02">Casa Matriz</option>
                <option value="07">Sucursal</option>
                <option value="20">Empresa en Casa</option>
              </select>
              {errors.tipo_establecimiento && <p className="error-msg" role="alert">{errors.tipo_establecimiento.message}</p>}
            </div>

          </div>
        </div>

        {/* SECCIÓN 2 — Credenciales Hacienda */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Credenciales Hacienda</h2>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <p className="sm:col-span-2 text-xs text-gray-400">
              Estas credenciales se usan para autenticarse con la API del Ministerio de Hacienda
              al transmitir DTEs. Se guardan encriptadas en la base de datos.
            </p>

            <div>
              <label htmlFor="usuario_hacienda" className="label">Usuario Hacienda</label>
              <input
                id="usuario_hacienda"
                type="email"
                placeholder="usuario@empresa.com"
                className="input"
                {...register('usuario_hacienda')}
              />
            </div>

            <div>
              <label htmlFor="password_hacienda" className="label">
                Password Hacienda
                <span className="text-gray-400 font-normal ml-1">(dejar vacío para no cambiar)</span>
              </label>
              <div className="relative">
                <input
                  id="password_hacienda"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="input pr-10"
                  {...register('password_hacienda')}
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
            </div>
          </div>
        </div>

        {/* SECCIÓN 3 — Estado de servicios */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Estado de servicios</h2>
          </div>
          <div className="card-body space-y-4">

            {/* Ambiente */}
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-700">Ambiente</p>
                <p className="text-xs text-gray-400">Configurado en el servidor</p>
              </div>
              <span className={`badge ${esProduccion ? 'badge-rechazado' : 'badge-firmado'}`}>
                {esProduccion ? 'PRODUCCIÓN' : 'PRUEBAS'}
              </span>
            </div>

            {/* Firmador */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Firmador electrónico</p>
                <p className="text-xs text-gray-400">Servicio de firma del MH</p>
              </div>
              <div className="flex items-center gap-3">
                <EstadoConexion estado={estadoFirmador} />
                <button
                  type="button"
                  onClick={probarFirmador}
                  disabled={estadoFirmador === 'probando'}
                  className="btn-secondary btn-sm"
                >
                  <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
                  Probar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between">
          {isDirty && (
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              Tienes cambios sin guardar
            </p>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={isSaving || !isDirty}
              className="btn-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default Configuracion;
