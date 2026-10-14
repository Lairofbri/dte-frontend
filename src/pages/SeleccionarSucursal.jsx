// src/pages/SeleccionarSucursal.jsx
// Fase C3 — paso post-login del administrador: elegir la sucursal para operar.
// Cards con nombre + estado fiscal (ready/pending_*); con una sola sucursal
// activa se auto-selecciona (sin paso extra). El operador no pasa por acá:
// mantiene el establecimiento fijo de su JWT (AdminRoute redirige al dashboard).

import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Building2, Loader2, MapPin, RefreshCw, ReceiptText } from 'lucide-react';
import { useEstablecimientos } from '../hooks/useEstablecimientos';
import { useAuthStore, selectEstablecimientoSeleccionado } from '../store/auth.store';
import { BadgeGenerico } from '../components/ui/Badge';
import Button from '../components/ui/Button';

// Tipos de establecimiento (CAT-009)
const TIPOS_ESTABLECIMIENTO = {
  '01': 'Casa Matriz',
  '02': 'Sucursal',
  '04': 'Bodega',
  '07': 'Punto de venta',
};

// Estados fiscales del vínculo POS ↔ DTE (spec §5)
const INFO_ESTADO_FISCAL = {
  ready:           { label: 'Listo para emitir', variant: 'green'  },
  pending_mh_data: { label: 'Faltan datos MH',   variant: 'yellow' },
  pending_link:    { label: 'Sin vínculo',       variant: 'gray'   },
  inactive:        { label: 'Inactivo',          variant: 'gray'   },
  blocked:         { label: 'Bloqueado',         variant: 'red'    },
};

const SeleccionarSucursal = () => {
  const navigate        = useNavigate();
  const setSeleccionada = useAuthStore((s) => s.setEstablecimientoSeleccionado);
  const seleccionada    = useAuthStore(selectEstablecimientoSeleccionado);

  const { establecimientos, isLoading, error, recargar } = useEstablecimientos();

  const activas = establecimientos.filter((est) => est.activo);
  // Mientras no haya selección y exista una única sucursal activa, el efecto
  // de abajo la auto-selecciona (decisión D1: sin paso extra).
  const autoSeleccionando =
    activas.length === 1 && !seleccionada && !isLoading && !error;

  const elegir = useCallback((est) => {
    setSeleccionada(est);
    toast.success(`Vas a operar en ${est.nombre}.`);
    navigate('/dashboard', { replace: true });
  }, [navigate, setSeleccionada]);

  // Una sola sucursal activa → auto-selección (decisión D1 del propietario).
  // El guard es la selección del store (no state local): idempotente y sin
  // setState dentro del efecto.
  useEffect(() => {
    if (isLoading || error || seleccionada) return;
    if (activas.length === 1) {
      elegir(activas[0]);
    }
  }, [activas, elegir, error, isLoading, seleccionada]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4 shadow-lg shadow-primary-900/20">
            <ReceiptText className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold font-sans text-gray-900">
            Elegí la sucursal
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Vas a operar con esta sucursal. Podés cambiarla después desde la barra lateral.
          </p>
        </div>

        <div className="card">
          <div className="card-body py-8 px-8">

            {isLoading || autoSeleccionando ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600" aria-hidden="true" />
                <p className="text-sm text-gray-500">
                  {autoSeleccionando ? 'Seleccionando tu sucursal...' : 'Cargando sucursales...'}
                </p>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600" role="alert">{error}</p>
                <button
                  type="button"
                  onClick={recargar}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-800"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reintentar
                </button>
              </div>
            ) : activas.length === 0 ? (
              <div className="text-center py-4">
                <Building2 className="mx-auto h-8 w-8 text-gray-300 mb-3" aria-hidden="true" />
                <p className="text-sm text-gray-600 mb-1">
                  No hay sucursales activas en esta empresa.
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  Activá o creá una sucursal para poder emitir DTEs.
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="secondary" onClick={() => navigate('/establecimientos')}>
                    Gestionar sucursales
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/dashboard', { replace: true })}>
                    Ir al dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {establecimientos.map((est) => {
                  const info = INFO_ESTADO_FISCAL[est.fiscal_status]
                    ?? { label: est.fiscal_status, variant: 'gray' };
                  const puedeElegir = est.activo;

                  return (
                    <button
                      key={est.id}
                      type="button"
                      onClick={() => puedeElegir && elegir(est)}
                      disabled={!puedeElegir}
                      aria-label={`Operar en ${est.nombre}`}
                      className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-card transition-all hover:border-primary-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-gray-200 disabled:hover:shadow-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                            <Building2 className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-800">{est.nombre}</p>
                            <p className="text-xs text-gray-500">
                              {TIPOS_ESTABLECIMIENTO[est.tipo_establecimiento] ?? 'Sucursal'}
                              {est.cod_estable_mh ? ` · ${est.cod_estable_mh}` : ''}
                            </p>
                          </div>
                        </div>
                        <BadgeGenerico variant={info.variant}>{info.label}</BadgeGenerico>
                      </div>

                      {est.direccion && (
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{est.direccion}</span>
                        </p>
                      )}

                      {!est.activo && (
                        <p className="mt-2 text-xs font-medium text-red-500">
                          Sucursal desactivada
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          DTE Flash © {new Date().getFullYear()} — El Salvador
        </p>
      </div>
    </div>
  );
};

export default SeleccionarSucursal;
