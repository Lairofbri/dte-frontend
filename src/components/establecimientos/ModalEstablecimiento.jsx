// src/components/establecimientos/ModalEstablecimiento.jsx
// Modal para crear y editar establecimientos
// Campos según el schema exacto del backend

import { useEffect, useId, useState, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver }      from '@hookform/resolvers/zod';
import { z }                from 'zod';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import { BadgeGenerico } from '../ui/Badge';
import { listarEstablecimientosApi } from '../../api/establecimientos.api';
import { useTerritorio } from '../../hooks/useTerritorio';

// Estados fiscales del vínculo POS ↔ DTE (spec §5)
const INFO_ESTADO_FISCAL = {
  ready:           { label: 'Listo',          variant: 'green'  },
  pending_mh_data: { label: 'Faltan datos MH', variant: 'yellow' },
  pending_link:    { label: 'Sin vínculo',    variant: 'gray'   },
  inactive:        { label: 'Inactivo',       variant: 'gray'   },
  blocked:         { label: 'Bloqueado',      variant: 'red'    },
};

// ─────────────────────────────────────────────
// DIVISIÓN TERRITORIAL EL SALVADOR
// Nueva división: Departamento → Distrito → Sector
// Códigos según Hacienda DTE
// ─────────────────────────────────────────────
const DEPARTAMENTOS = [
  { cod: '01', nombre: 'Ahuachapán'   },
  { cod: '02', nombre: 'Santa Ana'    },
  { cod: '03', nombre: 'Sonsonate'    },
  { cod: '04', nombre: 'Chalatenango' },
  { cod: '05', nombre: 'La Libertad'  },
  { cod: '06', nombre: 'San Salvador' },
  { cod: '07', nombre: 'Cuscatlán'    },
  { cod: '08', nombre: 'La Paz'       },
  { cod: '09', nombre: 'Cabañas'      },
  { cod: '10', nombre: 'San Vicente'  },
  { cod: '11', nombre: 'Usulután'     },
  { cod: '12', nombre: 'San Miguel'   },
  { cod: '13', nombre: 'Morazán'      },
  { cod: '14', nombre: 'La Unión'     },
];

// Municipio (CAT-013) y Distrito (CAT-008): SIEMPRE desde el catálogo oficial
// filtrado por departamento (useTerritorio → migración 034). Los códigos se
// repiten entre departamentos — nunca hardcodear listas locales.

// ─────────────────────────────────────────────
// SCHEMA
// Sin campo "tipo" — no existe en el backend de establecimientos
// ─────────────────────────────────────────────
const codRegex = /^[A-Z0-9]{1,4}$/i;

const schema = z.object({
  tipo_establecimiento: z.enum(['01', '02', '04', '07']),
  nombre:             z.string().min(3, 'Mínimo 3 caracteres.'),
  cod_estable_mh:     z.string().min(1, 'Requerido.').regex(codRegex, '1-4 caracteres alfanuméricos.'),
  cod_punto_venta_mh: z.string().min(1, 'Requerido.').regex(codRegex, '1-4 caracteres alfanuméricos.'),
  direccion:          z.string().min(5, 'Mínimo 5 caracteres.'),
  departamento_cod:   z.string().length(2, 'Selecciona un departamento.'),
  municipio_cod:      z.string().length(2, 'Selecciona un municipio (CAT-013).'),
  distrito_cod:       z.string().length(2, 'Selecciona un distrito (CAT-008).'),
  telefono:           z.string().max(20).optional().or(z.literal('')),
  email:              z.string().email('Email inválido.').optional().or(z.literal('')),
});

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────
const ModalEstablecimiento = ({ isOpen, onClose, onGuardar, establecimiento = null }) => {
  const modoEdicion = !!establecimiento;
  // Fase 6 (spec §11): los códigos MH forman parte del número de control y
  // NO se modifican después de emitir DTEs. El backend devuelve tiene_dtes.
  const tieneDtes   = !!(modoEdicion && establecimiento?.tiene_dtes);
  const formId      = useId();
  const [estadoCod,    setEstadoCod]    = useState(null);
  const [errorApi,     setErrorApi]     = useState('');
  const [deptoActual,  setDeptoActual]  = useState('06');

  // Catálogos territoriales oficiales del departamento seleccionado
  // (municipio CAT-013 / distrito CAT-008 — migración 034).
  const {
    municipios, distritos,
    cargando: cargandoTerritorio,
    error:    errorTerritorio,
  } = useTerritorio(deptoActual);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode:     'onChange',
  });

  const municipioActual = useWatch({ control, name: 'municipio_cod' });
  const distritoActual  = useWatch({ control, name: 'distrito_cod' });
  const municipioFueraDeCatalogo = !cargandoTerritorio && !errorTerritorio
    && municipioActual && municipios.length > 0
    && !municipios.some((m) => m.value === municipioActual);
  const distritoFueraDeCatalogo = !cargandoTerritorio && !errorTerritorio
    && distritoActual && distritos.length > 0
    && !distritos.some((d) => d.value === distritoActual);

  useEffect(() => {
    if (isOpen) {
      const depto = establecimiento?.departamento_cod ?? '06';
      queueMicrotask(() => {
        setDeptoActual(depto);
        setEstadoCod(null);
        setErrorApi('');
        reset({
          tipo_establecimiento: establecimiento?.tipo_establecimiento ?? '02',
          nombre:             establecimiento?.nombre             ?? '',
          cod_estable_mh:     establecimiento?.cod_estable_mh     ?? '',
          cod_punto_venta_mh: establecimiento?.cod_punto_venta_mh ?? '',
          direccion:          establecimiento?.direccion          ?? '',
          departamento_cod:   depto,
          municipio_cod:      establecimiento?.municipio_cod      ?? '',
          distrito_cod:       establecimiento?.distrito_cod       ?? '',
          telefono:           establecimiento?.telefono           ?? '',
          email:              establecimiento?.email              ?? '',
        });
      });
    }
  }, [isOpen, establecimiento, reset]);

  // ── Verificar combinación sucursal+caja al salir del campo ──
  const verificarCombinacion = useCallback(async () => {
    const codEstable = getValues('cod_estable_mh');
    const codPvta    = getValues('cod_punto_venta_mh');
    if (!codEstable || !codPvta) return;
    setEstadoCod('verificando');
    try {
      const datos = await listarEstablecimientosApi();
      const lista = datos?.establecimientos ?? datos ?? [];
      const existe = lista.some(
        (e) =>
          e.cod_estable_mh?.toUpperCase()     === codEstable.toUpperCase() &&
          e.cod_punto_venta_mh?.toUpperCase() === codPvta.toUpperCase()    &&
          e.id !== establecimiento?.id
      );
      setEstadoCod(existe ? 'ocupado' : 'disponible');
    } catch {
      setEstadoCod(null);
    }
  }, [getValues, establecimiento]);

  // ── Autoformatear teléfono: 00000000 → 0000-0000 ──
  const formatearTelefono = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (soloNumeros.length <= 4) {
      e.target.value = soloNumeros;
    } else {
      e.target.value = `${soloNumeros.slice(0, 4)}-${soloNumeros.slice(4)}`;
    }
  };

  const onSubmit = async (datos) => {
    if (estadoCod === 'ocupado') return;
    setErrorApi('');
    try {
      // Fase 6: si el establecimiento ya emitió DTEs, los códigos MH viajan
      // como undefined → JSON.stringify los omite → el backend no los toca.
      const payload = tieneDtes
        ? { ...datos, cod_estable_mh: undefined, cod_punto_venta_mh: undefined }
        : datos;
      await onGuardar(payload);
      onClose();
    } catch (err) {
      // Mostrar error del API dentro del modal — no solo toast
      const mensaje = err.response?.data?.mensaje || 'No se pudo guardar. Intenta de nuevo.';
      setErrorApi(mensaje);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modoEdicion ? 'Editar establecimiento' : 'Nueva sucursal'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {/* Error del API */}
        {errorApi && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600" role="alert">{errorApi}</p>
          </div>
        )}

        {/* Fase 3: estado fiscal del vínculo POS ↔ DTE */}
        {modoEdicion && (
          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Estado fiscal del vínculo POS ↔ DTE</p>
              {establecimiento.branch_id && (
                <p className="text-xs font-mono text-gray-400 mt-0.5 truncate" title="branch_id compartido">
                  branch_id: {establecimiento.branch_id}
                </p>
              )}
              {establecimiento.fiscal_status === 'pending_mh_data' && (
                <p className="text-xs text-yellow-700 mt-1">
                  Al guardar con códigos MH y dirección fiscal completos, pasa a Listo y se sincroniza con POS.
                </p>
              )}
              {establecimiento.fiscal_status === 'blocked' && establecimiento.sync_error && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {establecimiento.sync_error}
                </p>
              )}
            </div>
            <BadgeGenerico variant={INFO_ESTADO_FISCAL[establecimiento.fiscal_status]?.variant ?? 'gray'}>
              {INFO_ESTADO_FISCAL[establecimiento.fiscal_status]?.label ?? establecimiento.fiscal_status}
            </BadgeGenerico>
            {tieneDtes && (
              <p className="text-xs text-amber-700 mt-1">
                Este establecimiento ya emitió DTEs: los códigos MH no se pueden modificar porque forman parte del número de control histórico.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">

          {/* Tipo de establecimiento MH */}
          <div>
            <label htmlFor={`${formId}-tipo`} className="label">
              Tipo MH <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id={`${formId}-tipo`}
              className={`input ${errors.tipo_establecimiento ? 'input-error' : ''}`}
              {...register('tipo_establecimiento')}
            >
              <option value="01">Casa Matriz</option>
              <option value="02">Sucursal</option>
              <option value="04">Bodega</option>
              <option value="07">Punto de venta</option>
            </select>
            {errors.tipo_establecimiento && <p className="error-msg" role="alert">{errors.tipo_establecimiento.message}</p>}
          </div>

          {/* Nombre */}
          <div className="col-span-2">
            <label htmlFor={`${formId}-nombre`} className="label">
              Nombre <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id={`${formId}-nombre`}
              type="text"
              className={`input ${errors.nombre ? 'input-error' : ''}`}
              {...register('nombre')}
            />
            {errors.nombre && <p className="error-msg" role="alert">{errors.nombre.message}</p>}
          </div>

          {/* Código establecimiento MH */}
          <div>
            <label htmlFor={`${formId}-cod`} className="label">
              Código sucursal MH <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id={`${formId}-cod`}
              type="text"
              placeholder="0001"
              maxLength={4}
              readOnly={tieneDtes}
              title={tieneDtes ? 'No modificable: el establecimiento ya emitió DTEs' : undefined}
              className={`input font-mono ${tieneDtes ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''} ${errors.cod_estable_mh ? 'input-error' : ''}`}
              {...register('cod_estable_mh')}
            />
            {errors.cod_estable_mh && <p className="error-msg" role="alert">{errors.cod_estable_mh.message}</p>}
          </div>

          {/* Código punto de venta MH */}
          <div>
            <label htmlFor={`${formId}-pvta`} className="label">
              Código caja MH <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id={`${formId}-pvta`}
                type="text"
                placeholder="0001"
                maxLength={4}
                readOnly={tieneDtes}
                title={tieneDtes ? 'No modificable: el establecimiento ya emitió DTEs' : undefined}
                className={`input font-mono pr-8 ${tieneDtes ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''} ${errors.cod_punto_venta_mh ? 'input-error' : ''}`}
                {...register('cod_punto_venta_mh', { onBlur: tieneDtes ? undefined : verificarCombinacion })}
              />
              {estadoCod === 'verificando' && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
              {estadoCod === 'disponible' && <CheckCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
              {estadoCod === 'ocupado'    && <XCircle     className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500"   />}
            </div>
            {errors.cod_punto_venta_mh && <p className="error-msg" role="alert">{errors.cod_punto_venta_mh.message}</p>}
            {estadoCod === 'ocupado'    && !errors.cod_punto_venta_mh && <p className="error-msg" role="alert">Esta combinación sucursal + caja ya existe.</p>}
            {estadoCod === 'disponible' && <p className="text-xs text-green-600 mt-1">Combinación disponible.</p>}
            <p className="text-xs text-gray-400 mt-1">
              Una sucursal puede tener varias cajas. Ej: sucursal 0001 → caja 1 = 0001, caja 2 = 0002
            </p>
          </div>

          {/* Dirección */}
          <div className="col-span-2">
            <label htmlFor={`${formId}-dir`} className="label">
              Dirección <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id={`${formId}-dir`}
              type="text"
              className={`input ${errors.direccion ? 'input-error' : ''}`}
              {...register('direccion')}
            />
            {errors.direccion && <p className="error-msg" role="alert">{errors.direccion.message}</p>}
          </div>

          {/* Departamento */}
          <div>
            <label htmlFor={`${formId}-depto`} className="label">
              Departamento <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id={`${formId}-depto`}
              className={`input ${errors.departamento_cod ? 'input-error' : ''}`}
              {...register('departamento_cod', {
                onChange: (e) => {
                  setDeptoActual(e.target.value);
                  setValue('municipio_cod', '');
                  setValue('distrito_cod', '');
                },
              })}
            >
              {DEPARTAMENTOS.map((d) => (
                <option key={d.cod} value={d.cod}>{d.nombre}</option>
              ))}
            </select>
            {errors.departamento_cod && <p className="error-msg" role="alert">{errors.departamento_cod.message}</p>}
          </div>

          {/* Municipio (CAT-013) */}
          <div>
            <label htmlFor={`${formId}-muni`} className="label">
              Municipio <span className="text-red-500" aria-hidden="true">*</span>
              <span className="text-gray-400 font-normal ml-1 text-xs">(CAT-013, por departamento)</span>
            </label>
            <select
              id={`${formId}-muni`}
              className={`input ${errors.municipio_cod ? 'input-error' : ''}`}
              disabled={!deptoActual || cargandoTerritorio}
              {...register('municipio_cod')}
            >
              <option value="">{cargandoTerritorio ? 'Cargando catálogo…' : 'Seleccionar…'}</option>
              {municipios.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {errors.municipio_cod && <p className="error-msg" role="alert">{errors.municipio_cod.message}</p>}
            {municipioFueraDeCatalogo && (
              <p className="error-msg" role="alert">
                El código guardado ({municipioActual}) no existe en el catálogo CAT-013 para este departamento. Seleccioná el municipio correcto.
              </p>
            )}
            {errorTerritorio && (
              <p className="error-msg" role="alert">No se pudo cargar el catálogo de Hacienda. Reintentá en un momento.</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Municipio según la nueva división territorial (ej: San Salvador Centro = 23).
            </p>
          </div>

          {/* Distrito (CAT-008) */}
          <div>
            <label htmlFor={`${formId}-distrito`} className="label">
              Distrito <span className="text-red-500" aria-hidden="true">*</span>
              <span className="text-gray-400 font-normal ml-1 text-xs">(CAT-008, por departamento)</span>
            </label>
            <select
              id={`${formId}-distrito`}
              className={`input ${errors.distrito_cod ? 'input-error' : ''}`}
              disabled={!deptoActual || cargandoTerritorio}
              {...register('distrito_cod')}
            >
              <option value="">{cargandoTerritorio ? 'Cargando catálogo…' : 'Seleccionar…'}</option>
              {distritos.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            {errors.distrito_cod && <p className="error-msg" role="alert">{errors.distrito_cod.message}</p>}
            {distritoFueraDeCatalogo && (
              <p className="error-msg" role="alert">
                El código guardado ({distritoActual}) no existe en el catálogo CAT-008 para este departamento. Seleccioná el distrito correcto.
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Distrito según el catálogo vigente (ej: San Salvador = 14). El MH lo exige junto al municipio.
            </p>
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor={`${formId}-tel`} className="label">Teléfono</label>
            <input
              id={`${formId}-tel`}
              type="text"
              placeholder="00000000"
              inputMode="numeric"
              maxLength={9}
              className={`input ${errors.telefono ? 'input-error' : ''}`}
              {...register('telefono', { onChange: formatearTelefono })}
            />
            {errors.telefono && <p className="error-msg" role="alert">{errors.telefono.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor={`${formId}-email`} className="label">Email</label>
            <input
              id={`${formId}-email`}
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              {...register('email')}
            />
            {errors.email && <p className="error-msg" role="alert">{errors.email.message}</p>}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!isValid || estadoCod === 'ocupado' || estadoCod === 'verificando'}
          >
            {modoEdicion ? 'Guardar cambios' : 'Crear establecimiento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalEstablecimiento;
