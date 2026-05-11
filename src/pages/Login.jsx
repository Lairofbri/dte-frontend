// src/pages/Login.jsx
// Página de login del DTE Service
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
import { Eye, EyeOff, Zap, Loader2 } from 'lucide-react';
import { useAuthStore, selectIsAuthenticated } from '../store/auth.store';
import { useAuth } from '../hooks/useAuth';

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

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { login, isLoading } = useAuth();

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

  const onSubmit = async (datos) => {
    setErrorGeneral('');
    try {
      await login({ email: datos.email, password: datos.password });
    } catch (_) {
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
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-sans text-gray-900">
            DTE Service
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
                disabled={isLoading}
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
          DTE Service © {new Date().getFullYear()} — El Salvador
        </p>
      </div>
    </div>
  );
};

export default Login;
