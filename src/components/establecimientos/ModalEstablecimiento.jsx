// src/components/establecimientos/ModalEstablecimiento.jsx
// Modal para crear y editar establecimientos
// Campos según el schema exacto del backend

import { useEffect, useId, useState, useCallback } from 'react';
import { useForm }          from 'react-hook-form';
import { zodResolver }      from '@hookform/resolvers/zod';
import { z }                from 'zod';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Modal  from '../ui/Modal';
import Button from '../ui/Button';
import { listarEstablecimientosApi } from '../../api/establecimientos.api';

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

// Hacienda aún usa municipio_cod internamente aunque
// la división administrativa cambió — usar los códigos del catálogo DTE
// Nota: pendiente actualizar cuando Hacienda publique nuevos catálogos
const MUNICIPIOS = {
  '01': [{ cod: '01', nombre: 'Ahuachapán' }, { cod: '02', nombre: 'Apaneca' }, { cod: '03', nombre: 'Atiquizaya' }, { cod: '04', nombre: 'Concepción de Ataco' }],
  '02': [{ cod: '01', nombre: 'Santa Ana' }, { cod: '02', nombre: 'Coatepeque' }, { cod: '03', nombre: 'Chalchuapa' }, { cod: '04', nombre: 'El Congo' }],
  '03': [{ cod: '01', nombre: 'Sonsonate' }, { cod: '02', nombre: 'Acajutla' }, { cod: '03', nombre: 'Armenia' }, { cod: '04', nombre: 'Izalco' }],
  '04': [{ cod: '01', nombre: 'Chalatenango' }, { cod: '02', nombre: 'Agua Caliente' }, { cod: '03', nombre: 'La Palma' }],
  '05': [{ cod: '01', nombre: 'Nueva San Salvador' }, { cod: '02', nombre: 'Antiguo Cuscatlán' }, { cod: '03', nombre: 'Colón' }, { cod: '04', nombre: 'Santa Tecla' }],
  '06': [{ cod: '01', nombre: 'San Salvador' }, { cod: '02', nombre: 'Mejicanos' }, { cod: '03', nombre: 'Soyapango' }, { cod: '04', nombre: 'San Marcos' }, { cod: '05', nombre: 'Ilopango' }, { cod: '06', nombre: 'Apopa' }],
  '07': [{ cod: '01', nombre: 'Cojutepeque' }, { cod: '02', nombre: 'San Pedro Perulapán' }, { cod: '03', nombre: 'Santa Cruz Michapa' }],
  '08': [{ cod: '01', nombre: 'Zacatecoluca' }, { cod: '02', nombre: 'San Luis Talpa' }, { cod: '03', nombre: 'Olocuilta' }],
  '09': [{ cod: '01', nombre: 'Sensuntepeque' }, { cod: '02', nombre: 'Ilobasco' }, { cod: '03', nombre: 'Victoria' }],
  '10': [{ cod: '01', nombre: 'San Vicente' }, { cod: '02', nombre: 'Apastepeque' }, { cod: '03', nombre: 'Tepetitán' }],
  '11': [{ cod: '01', nombre: 'Usulután' }, { cod: '02', nombre: 'Jiquilisco' }, { cod: '03', nombre: 'Santiago de María' }],
  '12': [{ cod: '01', nombre: 'San Miguel' }, { cod: '02', nombre: 'Moncagua' }, { cod: '03', nombre: 'Chinameca' }],
  '13': [{ cod: '01', nombre: 'San Francisco Gotera' }, { cod: '02', nombre: 'Jocoro' }, { cod: '03', nombre: 'Osicala' }],
  '14': [{ cod: '01', nombre: 'La Unión' }, { cod: '02', nombre: 'Santa Rosa de Lima' }, { cod: '03', nombre: 'Conchagua' }],
};

// ─────────────────────────────────────────────
// SCHEMA
// Sin campo "tipo" — no existe en el backend de establecimientos
// ─────────────────────────────────────────────
const codRegex = /^[A-Z0-9]{1,4}$/i;

const schema = z.object({
  nombre:             z.string().min(3, 'Mínimo 3 caracteres.'),
  cod_estable_mh:     z.string().min(1, 'Requerido.').regex(codRegex, '1-4 caracteres alfanuméricos.'),
  cod_punto_venta_mh: z.string().min(1, 'Requerido.').regex(codRegex, '1-4 caracteres alfanuméricos.'),
  direccion:          z.string().min(5, 'Mínimo 5 caracteres.'),
  departamento_cod:   z.string().length(2, 'Selecciona un departamento.'),
  municipio_cod:      z.string().min(1, 'Selecciona un municipio.'),
  telefono:           z.string().max(20).optional().or(z.literal('')),
  email:              z.string().email('Email inválido.').optional().or(z.literal('')),
});

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────
const ModalEstablecimiento = ({ isOpen, onClose, onGuardar, establecimiento = null }) => {
  const modoEdicion = !!establecimiento;
  const formId      = useId();
  const [estadoCod,    setEstadoCod]    = useState(null);
  const [errorApi,     setErrorApi]     = useState('');
  const [deptoActual,  setDeptoActual]  = useState('06');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm({
    resolver: zodResolver(schema),
    mode:     'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      const depto = establecimiento?.departamento_cod ?? '06';
      setDeptoActual(depto);
      setEstadoCod(null);
      setErrorApi('');
      reset({
        nombre:             establecimiento?.nombre             ?? '',
        cod_estable_mh:     establecimiento?.cod_estable_mh     ?? '',
        cod_punto_venta_mh: establecimiento?.cod_punto_venta_mh ?? '',
        direccion:          establecimiento?.direccion          ?? '',
        departamento_cod:   depto,
        municipio_cod:      establecimiento?.municipio_cod      ?? '01',
        telefono:           establecimiento?.telefono           ?? '',
        email:              establecimiento?.email              ?? '',
      });
    }
  }, [isOpen, establecimiento, reset]);

  // ── Verificar combinación sucursal+caja al salir del campo ──
  const verificarCombinacion = useCallback(async () => {
    const codEstable = watch('cod_estable_mh');
    const codPvta    = watch('cod_punto_venta_mh');
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
    } catch (_) {
      setEstadoCod(null);
    }
  }, [watch, establecimiento]);

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
      await onGuardar(datos);
      onClose();
    } catch (err) {
      // Mostrar error del API dentro del modal — no solo toast
      const mensaje = err.response?.data?.mensaje || 'No se pudo guardar. Intenta de nuevo.';
      setErrorApi(mensaje);
    }
  };

  const municipiosActuales = MUNICIPIOS[deptoActual] ?? MUNICIPIOS['06'];

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

        <div className="grid grid-cols-2 gap-4">

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
              className={`input font-mono ${errors.cod_estable_mh ? 'input-error' : ''}`}
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
                className={`input font-mono pr-8 ${errors.cod_punto_venta_mh ? 'input-error' : ''}`}
                {...register('cod_punto_venta_mh', { onBlur: verificarCombinacion })}
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
                onChange: (e) => setDeptoActual(e.target.value),
              })}
            >
              {DEPARTAMENTOS.map((d) => (
                <option key={d.cod} value={d.cod}>{d.nombre}</option>
              ))}
            </select>
            {errors.departamento_cod && <p className="error-msg" role="alert">{errors.departamento_cod.message}</p>}
          </div>

          {/* Municipio */}
          <div>
            <label htmlFor={`${formId}-muni`} className="label">
              Municipio <span className="text-red-500" aria-hidden="true">*</span>
              <span className="text-gray-400 font-normal ml-1 text-xs">(catálogo Hacienda)</span>
            </label>
            <select
              id={`${formId}-muni`}
              className={`input ${errors.municipio_cod ? 'input-error' : ''}`}
              {...register('municipio_cod')}
            >
              {municipiosActuales.map((m) => (
                <option key={m.cod} value={m.cod}>{m.nombre}</option>
              ))}
            </select>
            {errors.municipio_cod && <p className="error-msg" role="alert">{errors.municipio_cod.message}</p>}
            <p className="text-xs text-gray-400 mt-1">
              Hacienda aún usa el catálogo de municipios — se actualizará cuando publiquen nuevos catálogos DTE.
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
