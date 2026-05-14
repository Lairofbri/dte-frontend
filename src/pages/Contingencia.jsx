// src/pages/Contingencia.jsx
// Gestión de DTEs en contingencia — notificar y enviar lotes al MH
//
// SEGURIDAD:
// → passwordPri NUNCA en estado persistente
// → Se limpia después de notificar (éxito o error)
// → Error del API visible dentro del formulario

import { useState, useEffect, useCallback } from 'react';
import { useForm }       from 'react-hook-form';
import { zodResolver }   from '@hookform/resolvers/zod';
import { z }             from 'zod';
import { toast }         from 'react-hot-toast';
import {
  AlertTriangle, Send, RefreshCw,
  CheckSquare, Square, Eye, EyeOff, Loader2,
} from 'lucide-react';
import {
  listarContingenciaApi,
  notificarContingenciaApi,
} from '../api/contingencia.api';
import Badge              from '../components/ui/Badge';
import Spinner            from '../components/ui/Spinner';
import Button             from '../components/ui/Button';
import { formatFechaHora, nombreTipoDTE } from '../utils/formatters';

// ─────────────────────────────────────────────
// TIPOS DE CONTINGENCIA (CAT MH)
// ─────────────────────────────────────────────
const TIPOS_CONTINGENCIA = [
  { value: 1, label: 'No disponibilidad del sistema del MH' },
  { value: 2, label: 'No disponibilidad de internet del emisor' },
  { value: 3, label: 'Falla en el sistema del emisor' },
  { value: 4, label: 'Caso fortuito o fuerza mayor' },
  { value: 5, label: 'Otro' },
];

// ─────────────────────────────────────────────
// SCHEMA DE NOTIFICACIÓN
// ─────────────────────────────────────────────
const schemaNotificar = z.object({
  tipo_contingencia: z.coerce.number().min(1).max(5),
  motivo:            z.string().min(5, 'Mínimo 5 caracteres.'),
  fecha_inicio:      z.string().min(1, 'La fecha de inicio es requerida.'),
  hora_inicio:       z.string().min(1, 'La hora de inicio es requerida.'),
  fecha_fin:         z.string().min(1, 'La fecha de fin es requerida.'),
  hora_fin:          z.string().min(1, 'La hora de fin es requerida.'),
  password_pri:      z.string().min(1, 'La contraseña de firma es requerida.'),
}).refine(
  (d) => {
    const inicio = new Date(`${d.fecha_inicio}T${d.hora_inicio}`);
    const fin    = new Date(`${d.fecha_fin}T${d.hora_fin}`);
    return inicio < fin;
  },
  { message: 'La fecha de inicio debe ser anterior a la fecha de fin.', path: ['fecha_fin'] }
).refine(
  (d) => {
    const fin = new Date(`${d.fecha_fin}T${d.hora_fin}`);
    return fin <= new Date();
  },
  { message: 'La fecha de fin no puede ser en el futuro.', path: ['hora_fin'] }
);

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const Contingencia = () => {
  const [dtes,            setDtes]            = useState([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState(null);
  const [seleccionados,   setSeleccionados]   = useState([]);
  const [enviandoLote,    setEnviandoLote]    = useState(false);
  const [showPassword,    setShowPassword]    = useState(false);
  const [errorApi,        setErrorApi]        = useState('');
  const [contadorRecarga, setContadorRecarga] = useState(0);

  // Todos los hooks ANTES de returns condicionales
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schemaNotificar),
    defaultValues: { tipo_contingencia: 1, motivo: '', fecha_inicio: '', hora_inicio: '', fecha_fin: '', hora_fin: '', password_pri: '' },
  });

  const recargar = useCallback(() => setContadorRecarga((p) => p + 1), []);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dtesData = await listarContingenciaApi();
        if (!cancelado) {
          setDtes(dtesData?.dtes ?? []);
        }
      } catch (_) {
        if (!cancelado) setError('No se pudieron cargar los datos de contingencia.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [contadorRecarga]);

  // ── Selección de DTEs ──
  const toggleSeleccion = (id) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (seleccionados.length === dtes.length) setSeleccionados([]);
    else setSeleccionados(dtes.map((d) => d.id));
  };

  // ── Notificar evento ──
  const onNotificar = async (datos) => {
    setErrorApi('');
    try {
      await notificarContingenciaApi({
        tipo_contingencia: Number(datos.tipo_contingencia),
        motivo:            datos.motivo,
        fecha_inicio:      datos.fecha_inicio,
        hora_inicio:       datos.hora_inicio,
        fecha_fin:         datos.fecha_fin,
        hora_fin:          datos.hora_fin,
        password_pri:      datos.password_pri,
      });
      toast.success('Evento de contingencia notificado al MH.');
      reset((v) => ({ ...v, password_pri: '' })); // limpiar passwordPri
      recargar();
    } catch (err) {
      setErrorApi(err.response?.data?.mensaje || 'No se pudo notificar al MH.');
      reset((v) => ({ ...v, password_pri: '' })); // limpiar passwordPri aunque falle
    }
  };

  // ── Enviar lote — el backend maneja el lote en /notificar ──
  // Para enviar DTEs pendientes se usa el mismo endpoint de notificar
  // con los codigos_generacion de los DTEs seleccionados

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  if (error) return (
    <div className="card p-8 text-center">
      <p className="text-gray-500 mb-4" role="alert">{error}</p>
      <Button variant="secondary" onClick={recargar}>
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Reintentar
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Contingencia</h1>
          <p className="page-subtitle">
            {dtes.length} DTE{dtes.length !== 1 ? 's' : ''} pendiente{dtes.length !== 1 ? 's' : ''} de enviar
          </p>
        </div>

      </div>

      {/* Alerta si hay DTEs pendientes */}
      {dtes.length > 0 && (
        <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              {dtes.length} DTE{dtes.length !== 1 ? 's' : ''} en contingencia
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Selecciona los DTEs que quieres enviar al MH y haz click en "Enviar lote".
              Primero debes notificar el evento de contingencia si aún no lo has hecho.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SECCIÓN 1 — DTEs pendientes */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">DTEs pendientes</h2>
            {dtes.length > 0 && (
              <button
                onClick={toggleTodos}
                className="text-xs text-primary-600 hover:underline"
              >
                {seleccionados.length === dtes.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            )}
          </div>
          <div className="card-body">
            {dtes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No hay DTEs pendientes en contingencia.
              </p>
            ) : (
              <ul className="space-y-2">
                {dtes.map((dte) => (
                  <li
                    key={dte.id}
                    onClick={() => toggleSeleccion(dte.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    role="checkbox"
                    aria-checked={seleccionados.includes(dte.id)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleSeleccion(dte.id); } }}
                  >
                    {seleccionados.includes(dte.id)
                      ? <CheckSquare className="w-4 h-4 text-primary-600 shrink-0" aria-hidden="true" />
                      : <Square      className="w-4 h-4 text-gray-300 shrink-0"      aria-hidden="true" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-700 truncate">
                        {dte.numero_control ?? dte.codigo_generacion?.slice(0, 16)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {nombreTipoDTE(dte.tipo_dte)} · {formatFechaHora(dte.creado_en)}
                      </p>
                    </div>
                    <Badge estado={dte.estado} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* SECCIÓN 2 — Notificar evento */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Notificar evento al MH</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit(onNotificar)} noValidate className="space-y-4">

              {errorApi && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600" role="alert">{errorApi}</p>
                </div>
              )}

              {/* Tipo */}
              <div>
                <label htmlFor="tipo_contingencia" className="label">
                  Tipo de contingencia <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <select id="tipo_contingencia" className="input" {...register('tipo_contingencia')}>
                  {TIPOS_CONTINGENCIA.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Motivo */}
              <div>
                <label htmlFor="motivo" className="label">
                  Motivo <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="motivo"
                  rows={2}
                  className={`input resize-none ${errors.motivo ? 'input-error' : ''}`}
                  placeholder="Describe brevemente el motivo de la contingencia..."
                  {...register('motivo')}
                />
                {errors.motivo && <p className="error-msg" role="alert">{errors.motivo.message}</p>}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fecha_inicio" className="label">
                    Fecha inicio <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input id="fecha_inicio" type="date"
                    className={`input ${errors.fecha_inicio ? 'input-error' : ''}`}
                    {...register('fecha_inicio')} />
                  {errors.fecha_inicio && <p className="error-msg" role="alert">{errors.fecha_inicio.message}</p>}
                </div>
                <div>
                  <label htmlFor="hora_inicio" className="label">
                    Hora inicio <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input id="hora_inicio" type="time"
                    className={`input ${errors.hora_inicio ? 'input-error' : ''}`}
                    {...register('hora_inicio')} />
                  {errors.hora_inicio && <p className="error-msg" role="alert">{errors.hora_inicio.message}</p>}
                </div>
                <div>
                  <label htmlFor="fecha_fin" className="label">
                    Fecha fin <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input id="fecha_fin" type="date"
                    className={`input ${errors.fecha_fin ? 'input-error' : ''}`}
                    {...register('fecha_fin')} />
                  {errors.fecha_fin && <p className="error-msg" role="alert">{errors.fecha_fin.message}</p>}
                </div>
                <div>
                  <label htmlFor="hora_fin" className="label">
                    Hora fin <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input id="hora_fin" type="time"
                    className={`input ${errors.hora_fin ? 'input-error' : ''}`}
                    {...register('hora_fin')} />
                  {errors.hora_fin && <p className="error-msg" role="alert">{errors.hora_fin.message}</p>}
                </div>
              </div>

              {/* passwordPri */}
              <div>
                <label htmlFor="password_pri" className="label">
                  Contraseña de firma (passwordPri) <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input id="password_pri"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="off"
                    className={`input pr-10 ${errors.password_pri ? 'input-error' : ''}`}
                    {...register('password_pri')} />
                  <button type="button"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
                {errors.password_pri && <p className="error-msg" role="alert">{errors.password_pri.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Notificando...</>
                  : <><Send className="w-4 h-4" aria-hidden="true" /> Notificar al MH</>
                }
              </button>
            </form>
          </div>
        </div>
      </div>


    </div>
  );
};

export default Contingencia;
