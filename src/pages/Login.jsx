// src/pages/Login.jsx
// Página de login de DTE Flash
//
// SEGURIDAD:
// → Mensaje de error fijo — no revelar si el email existe
// → Password se limpia después del submit fallido
// → No se loguea ninguna credencial
// → Si ya hay sesión activa → redirige al dashboard
//
// Fix: todos los hooks ANTES de cualquier return condicional
// → Regla de React: nunca llamar hooks después de un return

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ReceiptText, Loader2, Building2, RefreshCw } from 'lucide-react';
import { useAuthStore, selectIsAuthenticated } from '../store/auth.store';
import { useAuth } from '../hooks/useAuth';
import { useTenants } from '../hooks/useTenants';

// ─────────────────────────────────────────────
// SCHEMA DE VALIDACIÓN ZOD
// ─────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido.')
    .email('El email no tiene un formato válido.'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida.'),
});

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────
const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [tenantId, setTenantId] = useState('');

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { login, isLoading } = useAuth();
  const { tenants, isLoading: isLoadingTenants, error: tenantsError, recargar } = useTenants();

  // TODOS los hooks ANTES del return condicional
  // Fix: useForm declarado UNA SOLA VEZ aquí
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Return condicional DESPUÉS de todos los hooks
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

const empresaUnica = tenants.length === 1 ? tenants[0] : null;
  const tenantSeleccionado = tenantId || empresaUnica?.id || '';
  const empresaSeleccionada = tenants.find((tenant) => tenant.id === tenantSeleccionado);

  // Nombre que aparece al iniciar sesión: comercial si existe, si no la razón social.
  const nombreSesion = (tenant) => tenant.nombre_comercial || tenant.nombre;

  // Badge de estado de provisión (2026-10-07): el selector de empresa se
  // alimenta del estado fiscal real de cada tenant (GET /api/tenants).
  const INFO_PROVISION = {
    provisioning:        { label: 'Provisionando',          variant: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    pending_fiscal_setup: { label: 'Config. fiscal pendiente', variant: 'bg-blue-50 text-blue-700 border-blue-200' },
    active:              { label: 'Activa',                 variant: 'bg-green-50 text-green-700 border-green-200' },
    blocked:             { label: 'Bloqueada',              variant: 'bg-red-50 text-red-700 border-red-200' },
    failed:              { label: 'Fallida',                variant: 'bg-red-50 text-red-700 border-red-200' },
  };
  const infoProvision = INFO_PROVISION[empresaSeleccionada?.provisioning_status] ?? null;

  const onSubmit = async (datos) => {
    setErrorGeneral('');
    if (!tenantSeleccionado) {
      setErrorGeneral('Selecciona una empresa para continuar.');
      return;
    }

    try {
      await login({
        email: datos.email,
        password: datos.password,
        tenant_id: tenantSeleccionado,
      });
    } catch {
      // Mensaje fijo — nunca del API (lección de CUBIC)
      setErrorGeneral('Correo o contraseña incorrectos.');
      // Limpiar solo el password — mantener el email
      reset({ email: datos.email, password: '' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4 shadow-lg shadow-primary-900/20">
            <ReceiptText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-sans text-gray-900">
            DTE Flash
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Facturación Electrónica El Salvador
          </p>
        </div>

        {/* Card del formulario */}
        <div className="card">
          <div className="card-body py-8 px-8">
            <h2 className="text-lg font-semibold font-sans text-gray-800 mb-6">
              Iniciar sesión
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {isLoadingTenants ? (
                <div className="mb-5 flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-600" aria-hidden="true" />
                  Cargando empresas disponibles...
                </div>
              ) : tenantsError ? (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-600" role="alert">{tenantsError}</p>
                  <button
                    type="button"
                    onClick={recargar}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-800"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Reintentar
                  </button>
                </div>
              ) : (
                <div className="mb-5">
                  {tenants.length > 1 ? (
                    <>
                      <label htmlFor="tenant_id" className="label flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-primary-600" aria-hidden="true" />
                        Empresa
                      </label>
<select
                        id="tenant_id"
                        value={tenantSeleccionado}
                        onChange={(event) => {
                          setTenantId(event.target.value);
                          setErrorGeneral('');
                        }}
                        className="input"
                        required
                      >
                        <option value="">Seleccionar empresa...</option>
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>{nombreSesion(tenant)}</option>
                        ))}
                      </select>
                      {infoProvision ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] font-medium text-gray-500">Estado fiscal:</span>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${infoProvision.variant}`}>
                            {infoProvision.label}
                          </span>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-primary-100 bg-primary-50/60 px-3 py-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-primary-700 shadow-sm">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-primary-700">Empresa</p>
                        <p className="truncate text-sm font-medium text-gray-800">{nombreSesion(empresaSeleccionada) || 'Sin empresas activas'}</p>
                        {empresaSeleccionada?.nombre && empresaSeleccionada.nombre !== nombreSesion(empresaSeleccionada) ? (
                          <p className="truncate text-xs text-gray-500">{empresaSeleccionada.nombre}</p>
                        ) : null}
                        {infoProvision ? (
                          <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${infoProvision.variant}`}>
                            {infoProvision.label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error general */}
              {errorGeneral && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errorGeneral}</p>
                </div>
              )}

              {/* Campo email */}
              <div className="mb-4">
                <label htmlFor="email" className="label">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@empresa.com"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="error-msg" role="alert">{errors.email.message}</p>
                )}
              </div>

              {/* Campo password con toggle */}
              <div className="mb-6">
                <label htmlFor="password" className="label">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                    {...register('password')}
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
                {errors.password && (
                  <p className="error-msg" role="alert">{errors.password.message}</p>
                )}
              </div>

              {/* Botón submit */}
              <button
                type="submit"
                disabled={isLoading || isLoadingTenants || !!tenantsError || !tenantSeleccionado}
                className="btn-primary w-full btn-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
           DTE Flash © {new Date().getFullYear()} — El Salvador
        </p>
      </div>
    </div>
  );
};

export default Login;
