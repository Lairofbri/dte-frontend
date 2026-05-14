// src/pages/DTEs/DTEEmitir.jsx
// Formulario completo para emitir FCF, CCF y FSE
// Campos según estructura oficial Hacienda El Salvador

import { useState }               from 'react';
import { useNavigate }            from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver }            from '@hookform/resolvers/zod';
import { z }                      from 'zod';
import {
  Plus, Trash2, ArrowLeft,
  Eye, EyeOff, Loader2, Lock,
} from 'lucide-react';
import { useEmitirDTE, calcularTotales } from '../../hooks/useEmitirDTE';
import { formatMonto }            from '../../utils/formatters';

// ─────────────────────────────────────────────
// CATÁLOGOS
// ─────────────────────────────────────────────
const TIPOS_ITEM = [
  { value: 2, label: 'Servicio (2)' },
  { value: 1, label: 'Bien (1)' },
  { value: 3, label: 'Ambos (3)' },
  { value: 4, label: 'Otro (4)' },
];

const FORMAS_PAGO = [
  { value: '01', label: 'Billetes y monedas (01)' },
  { value: '02', label: 'Tarjeta débito (02)' },
  { value: '03', label: 'Tarjeta crédito (03)' },
  { value: '04', label: 'Cheque (04)' },
  { value: '05', label: 'Transferencia (05)' },
  { value: '08', label: 'Dinero electrónico (08)' },
  { value: '99', label: 'Otros (99)' },
];

const TIPOS_DOC = [
  { value: '13', label: 'DUI (13)' },
  { value: '36', label: 'NIT (36)' },
  { value: '03', label: 'Pasaporte (03)' },
  { value: '02', label: 'Carnet residente (02)' },
  { value: '37', label: 'Otro (37)' },
];

const DEPARTAMENTOS = [
  { cod: '06', nombre: 'San Salvador' },
  { cod: '05', nombre: 'La Libertad' },
  { cod: '01', nombre: 'Ahuachapán' },
  { cod: '02', nombre: 'Santa Ana' },
  { cod: '03', nombre: 'Sonsonate' },
  { cod: '04', nombre: 'Chalatenango' },
  { cod: '07', nombre: 'Cuscatlán' },
  { cod: '08', nombre: 'La Paz' },
  { cod: '09', nombre: 'Cabañas' },
  { cod: '10', nombre: 'San Vicente' },
  { cod: '11', nombre: 'Usulután' },
  { cod: '12', nombre: 'San Miguel' },
  { cod: '13', label: 'Morazán' },
  { cod: '14', nombre: 'La Unión' },
];

const PLAZOS = [
  { value: '01', label: 'Días (01)' },
  { value: '02', label: 'Meses (02)' },
  { value: '03', label: 'Años (03)' },
];

// ─────────────────────────────────────────────
// NÚMERO A LETRAS (simplificado frontend)
// ─────────────────────────────────────────────
const numeroALetras = (monto) => {
  if (isNaN(monto) || monto <= 0) return '';
  const entero   = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const u = ['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
    'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE'];
  const d = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const c = ['','CIEN','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
    'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  const v = ['','VEINTIÚN','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  const menorMil = (n) => {
    if (!n) return '';
    if (n===100) return 'CIEN';
    if (n<20) return u[n];
    if (n>=21&&n<=29) return v[n-20];
    if (n<100) { const dd=Math.floor(n/10),uu=n%10; return uu?`${d[dd]} Y ${u[uu]}`:d[dd]; }
    const cc=Math.floor(n/100),r=n%100;
    return r?(cc===1?`CIENTO ${menorMil(r)}`:`${c[cc]} ${menorMil(r)}`):c[cc];
  };
  const conv = (n) => {
    if (!n) return 'CERO';
    if (n<1000) return menorMil(n);
    const m=Math.floor(n/1000),r=n%1000;
    const p=m===1?'MIL':`${menorMil(m)} MIL`;
    return r?`${p} ${menorMil(r)}`:p;
  };
  return `${conv(entero)} ${centavos.toString().padStart(2,'0')}/100 DÓLARES`;
};

// ─────────────────────────────────────────────
// SCHEMAS ZOD
// ─────────────────────────────────────────────
const itemSchema = z.object({
  descripcion:     z.string().min(1, 'Descripción requerida.'),
  tipo_item:       z.coerce.number().int().min(1).max(4).default(2),
  uni_medida:      z.coerce.number().int().min(1).max(99).default(59),
  cantidad:        z.coerce.number().positive('Debe ser mayor a 0.'),
  precio_unitario: z.coerce.number().positive('Debe ser mayor a 0.'),
  descuento_pct:   z.coerce.number().min(0).max(99.99).default(0),
  venta_no_suj:    z.coerce.number().min(0).default(0),
  venta_exenta:    z.coerce.number().min(0).default(0),
}).refine((item) => {
  const sub = item.cantidad * item.precio_unitario;
  const desc = sub * (item.descuento_pct / 100);
  return (sub - desc) > 0.005;
}, { message: 'El total del ítem debe ser mayor a $0.01.', path: ['descuento_pct'] });

const pagoSchema = z.object({
  codigo:     z.string().min(2),
  montoPago:  z.coerce.number().positive('Monto requerido.'),
  referencia: z.string().optional().or(z.literal('')),
  plazo:      z.string().optional().nullable(),
  periodo:    z.coerce.number().int().min(1).optional().nullable(),
});

const schemaBase = z.object({
  tipo_dte:            z.enum(['01', '03', '14']),
  condicion_operacion: z.coerce.number().int().min(1).max(3).default(1),
  items:               z.array(itemSchema).min(1, 'Agrega al menos un ítem.'),
  pagos:               z.array(pagoSchema).min(1, 'Agrega al menos una forma de pago.'),
  password_pri:        z.string().min(1, 'La contraseña de firma es requerida.'),
  // Extensión (opcional)
  ext_nomb_entrega:    z.string().optional().or(z.literal('')),
  ext_nomb_recibe:     z.string().optional().or(z.literal('')),
  ext_placa:           z.string().optional().or(z.literal('')),
  ext_observaciones:   z.string().optional().or(z.literal('')),
});

const schemaFCF = schemaBase.extend({
  rec_nombre:        z.string().optional().or(z.literal('')),
  rec_tipo_doc:      z.string().optional(),
  rec_num_doc:       z.string().optional().or(z.literal('')),
  rec_correo:        z.string().email('Email inválido.').optional().or(z.literal('')),
  rec_telefono:      z.string().optional().or(z.literal('')),
});

const schemaCCF = schemaBase.extend({
  rec_nombre:        z.string().min(1, 'Nombre del receptor requerido.'),
  rec_nit:           z.string().regex(/^\d{4}-\d{6}-\d{3}-\d$/, 'Formato: 0000-000000-000-0'),
  rec_nrc:           z.string().optional().or(z.literal('')),
  rec_cod_actividad: z.string().optional().or(z.literal('')),
  rec_desc_actividad: z.string().optional().or(z.literal('')),
  rec_correo:        z.string().email('Email inválido.').optional().or(z.literal('')),
  rec_telefono:      z.string().optional().or(z.literal('')),
  rec_depto:         z.string().optional(),
  rec_municipio:     z.string().optional(),
});

const schemaFSE = schemaBase.extend({
  rec_nombre:   z.string().min(1, 'Nombre requerido.'),
  rec_nit:      z.string().regex(/^\d{4}-\d{6}-\d{3}-\d$/, 'Formato: 0000-000000-000-0'),
  rec_correo:   z.string().email('Email inválido.').optional().or(z.literal('')),
  rec_telefono: z.string().optional().or(z.literal('')),
});

const getSchema = (t) => t === '03' ? schemaCCF : t === '14' ? schemaFSE : schemaFCF;

const ITEM_VACIO = {
  descripcion: '', tipo_item: 2, uni_medida: 59,
  cantidad: 1, precio_unitario: 0,
  descuento_pct: 0, venta_no_suj: 0, venta_exenta: 0,
};

const PAGO_VACIO = { codigo: '01', montoPago: 0, referencia: '', plazo: null, periodo: null };

// ─────────────────────────────────────────────
// SUBCOMPONENTES
// ─────────────────────────────────────────────
const Field = ({ label, req, children, error, note }) => (
  <div>
    <label className="label">
      {label}{req && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
    </label>
    {children}
    {error && <p className="error-msg" role="alert">{error}</p>}
    {note  && <p className="text-xs text-gray-400 mt-1">{note}</p>}
  </div>
);

const DisabledNote = ({ msg }) => (
  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
    <Lock className="w-3 h-3" aria-hidden="true" />{msg}
  </p>
);

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const DTEEmitir = () => {
  const navigate           = useNavigate();
  const { emitir }         = useEmitirDTE();
  const [isLoading, setIsLoading]     = useState(false);
  const [showPwd,   setShowPwd]       = useState(false);
  const [tipoDte,   setTipoDte]       = useState('01');
  const [condicion, setCondicion]     = useState(1);
  const [errorApi,  setErrorApi]      = useState('');

  const { register, control, handleSubmit, watch, reset,
    formState: { errors } } = useForm({
    resolver: zodResolver(getSchema(tipoDte)),
    defaultValues: {
      tipo_dte: '01', condicion_operacion: 1,
      items: [ITEM_VACIO],
      pagos: [{ ...PAGO_VACIO }],
      password_pri: '',
    },
    mode: 'onChange',
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } =
    useFieldArray({ control, name: 'items' });
  const { fields: pagoFields, append: appendPago, remove: removePago } =
    useFieldArray({ control, name: 'pagos' });

  const itemsActuales = watch('items') ?? [];
  const totales       = calcularTotales(itemsActuales, tipoDte);
  const esCCF         = tipoDte === '03';
  const esFSE         = tipoDte === '14';

  const cambiarTipo = (t) => {
    setTipoDte(t);
    reset((v) => ({ ...v, tipo_dte: t, password_pri: '' }));
  };

  const onSubmit = async (datos) => {
    setIsLoading(true);
    setErrorApi('');
    try {
      // Construir receptor según tipo
      let receptor = null;
      if (tipoDte === '01' && datos.rec_nombre) {
        receptor = {
          nombre:        datos.rec_nombre,
          tipo_documento: datos.rec_tipo_doc || null,
          num_documento:  datos.rec_num_doc  || null,
          correo:        datos.rec_correo    || null,
          telefono:      datos.rec_telefono  || null,
        };
      } else if (tipoDte === '03') {
        receptor = {
          nit:            datos.rec_nit,
          nrc:            datos.rec_nrc            || null,
          nombre:         datos.rec_nombre,
          cod_actividad:  datos.rec_cod_actividad  || null,
          desc_actividad: datos.rec_desc_actividad || null,
          correo:         datos.rec_correo         || null,
          telefono:       datos.rec_telefono       || null,
          departamento_cod: datos.rec_depto        || null,
          municipio_cod:  datos.rec_municipio      || null,
        };
      } else if (tipoDte === '14') {
        receptor = {
          nit:      datos.rec_nit,
          nombre:   datos.rec_nombre,
          correo:   datos.rec_correo   || null,
          telefono: datos.rec_telefono || null,
        };
      }

      // Extensión
      const tieneExtension = datos.ext_nomb_entrega || datos.ext_nomb_recibe ||
        datos.ext_placa || datos.ext_observaciones;
      const extension = tieneExtension ? {
        nomb_entrega:  datos.ext_nomb_entrega  || null,
        nomb_recibe:   datos.ext_nomb_recibe   || null,
        placa_vehiculo: datos.ext_placa        || null,
        observaciones: datos.ext_observaciones || null,
      } : null;

      await emitir({
        tipoDte,
        receptor,
        items:               datos.items,
        pagos:               datos.pagos,
        condicionOperacion:  condicion,
        extension,
        passwordPri:         datos.password_pri,
      });
    } catch (_) {
      const msg = _.response?.data?.mensaje || 'No se pudo emitir el DTE.';
      setErrorApi(msg);
      reset((v) => ({ ...v, password_pri: '' }));
    } finally {
      setIsLoading(false);
    }
  };

  const isCreditoActivo = condicion === 2;

  return (
    <div className="max-w-4xl space-y-4">

      {/* Header */}
      <div>
        <button onClick={() => navigate('/dtes')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
          aria-label="Volver al listado">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Volver al listado
        </button>
        <h1 className="page-title">Emitir DTE</h1>
        <p className="page-subtitle">Los campos marcados con * son requeridos por Hacienda</p>
      </div>

      {errorApi && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600" role="alert">{errorApi}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {/* 1. Tipo de DTE */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Tipo de documento</h2>
          </div>
          <div className="card-body">
            <div className="flex flex-wrap gap-2">
              {[
                { v: '01', l: 'FCF — Factura consumidor final' },
                { v: '03', l: 'CCF — Crédito fiscal' },
                { v: '14', l: 'FSE — Sujeto excluido' },
              ].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => cambiarTipo(v)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    tipoDte === v
                      ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Receptor */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Receptor</h2>
            {tipoDte === '01' && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                opcional &lt; $1,095 en FCF
              </span>
            )}
          </div>
          <div className="card-body space-y-4">

            {/* Campos comunes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label="Nombre / razón social" req={esCCF || esFSE}
                  error={errors.rec_nombre?.message}>
                  <input type="text" className={`input ${errors.rec_nombre ? 'input-error' : ''}`}
                    placeholder="Nombre completo o razón social"
                    {...register('rec_nombre')} />
                </Field>
              </div>

              {/* FCF: tipo doc + num doc */}
              {!esCCF && !esFSE && (
                <>
                  <Field label="Tipo de documento">
                    <select className="input" {...register('rec_tipo_doc')}>
                      {TIPOS_DOC.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Número de documento">
                    <input type="text" className="input font-mono"
                      placeholder="00000000-0" {...register('rec_num_doc')} />
                  </Field>
                </>
              )}

              {/* CCF: NIT */}
              {(esCCF || esFSE) && (
                <Field label="NIT" req error={errors.rec_nit?.message}>
                  <input type="text" className={`input font-mono ${errors.rec_nit ? 'input-error' : ''}`}
                    placeholder="0000-000000-000-0" {...register('rec_nit')} />
                </Field>
              )}

              {/* CCF: NRC */}
              {esCCF && (
                <Field label="NRC" error={errors.rec_nrc?.message}>
                  <input type="text" className="input font-mono"
                    placeholder="000000-0" {...register('rec_nrc')} />
                </Field>
              )}

              <Field label="Correo" error={errors.rec_correo?.message}>
                <input type="email" className={`input ${errors.rec_correo ? 'input-error' : ''}`}
                  placeholder="correo@empresa.com" {...register('rec_correo')} />
              </Field>

              <Field label="Teléfono">
                <input type="text" className="input" placeholder="00000000"
                  {...register('rec_telefono')} />
              </Field>
            </div>

            {/* Campos exclusivos CCF */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                Datos adicionales — requeridos en CCF
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Código de actividad económica">
                  <input type="text" className="input font-mono"
                    placeholder="00000" disabled={!esCCF}
                    {...register('rec_cod_actividad')} />
                  {!esCCF && <DisabledNote msg="solo CCF" />}
                </Field>
                <Field label="Descripción de actividad">
                  <input type="text" className="input"
                    placeholder="Ej: Venta al por menor..." disabled={!esCCF}
                    {...register('rec_desc_actividad')} />
                  {!esCCF && <DisabledNote msg="solo CCF" />}
                </Field>
                <Field label="Departamento">
                  <select className="input" disabled={!esCCF} {...register('rec_depto')}>
                    <option value="">Seleccionar...</option>
                    {DEPARTAMENTOS.map(d => (
                      <option key={d.cod} value={d.cod}>{d.nombre || d.label}</option>
                    ))}
                  </select>
                  {!esCCF && <DisabledNote msg="solo CCF" />}
                </Field>
                <Field label="Distrito (municipio — CAT-013)">
                  <input type="text" className="input font-mono"
                    placeholder="Ej: 23 = San Salvador Centro"
                    disabled={!esCCF} {...register('rec_municipio')} />
                  {!esCCF && <DisabledNote msg="solo CCF" />}
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Ítems */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Ítems</h2>
            <button type="button" onClick={() => appendItem({ ...ITEM_VACIO })}
              className="btn-secondary btn-sm flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Agregar ítem
            </button>
          </div>
          <div className="card-body">
            {/* Cabecera tabla */}
            <div className="hidden lg:grid gap-2 pb-2 border-b border-gray-100 mb-3"
              style={{gridTemplateColumns:'2fr .6fr .55fr .65fr .6fr .6fr .6fr .38fr'}}>
              {['Descripción','Tipo','Cant.','Precio','Desc.%','No suj.','Exenta',''].map((h, i) => (
                <span key={i} className={`text-xs text-gray-400 font-medium uppercase tracking-wide ${i>1?'text-right':''}`}>{h}</span>
              ))}
            </div>

            {itemFields.map((field, idx) => (
              <div key={field.id} className="lg:grid gap-2 mb-3 pb-3 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0 space-y-2 lg:space-y-0 items-center"
                style={{gridTemplateColumns:'2fr .6fr .55fr .65fr .6fr .6fr .6fr .38fr'}}>

                {/* Descripción */}
                <div>
                  <label className="label lg:hidden">Descripción *</label>
                  <input type="text" placeholder="Descripción del producto o servicio"
                    className={`input text-sm ${errors.items?.[idx]?.descripcion ? 'input-error' : ''}`}
                    {...register(`items.${idx}.descripcion`)} />
                  {errors.items?.[idx]?.descripcion && (
                    <p className="error-msg">{errors.items[idx].descripcion.message}</p>
                  )}
                </div>

                {/* Tipo ítem */}
                <div>
                  <label className="label lg:hidden">Tipo</label>
                  <select className="input text-sm" {...register(`items.${idx}.tipo_item`)}>
                    {TIPOS_ITEM.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="label lg:hidden">Cantidad *</label>
                  <input type="number" min="0.0001" step="0.0001"
                    className="input input-number text-sm text-right"
                    {...register(`items.${idx}.cantidad`)} />
                </div>

                {/* Precio */}
                <div>
                  <label className="label lg:hidden">Precio ($) *</label>
                  <input type="number" min="0.01" step="0.01"
                    className="input input-number text-sm text-right"
                    {...register(`items.${idx}.precio_unitario`)} />
                </div>

                {/* Descuento % */}
                <div className="relative">
                  <label className="label lg:hidden">Desc. %</label>
                  <input type="number" min="0" max="99.99" step="0.01"
                    placeholder="0"
                    className="input input-number text-sm text-right pr-5"
                    {...register(`items.${idx}.descuento_pct`)} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                  {errors.items?.[idx]?.descuento_pct && (
                    <p className="error-msg text-xs">{errors.items[idx].descuento_pct.message}</p>
                  )}
                </div>

                {/* Venta no sujeta */}
                <div>
                  <label className="label lg:hidden">No suj. ($)</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    className="input input-number text-sm text-right"
                    disabled={esFSE}
                    {...register(`items.${idx}.venta_no_suj`)} />
                  {esFSE && <DisabledNote msg="no aplica FSE" />}
                </div>

                {/* Venta exenta */}
                <div>
                  <label className="label lg:hidden">Exenta ($)</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    className="input input-number text-sm text-right"
                    disabled={esFSE}
                    {...register(`items.${idx}.venta_exenta`)} />
                  {esFSE && <DisabledNote msg="no aplica FSE" />}
                </div>

                {/* Eliminar */}
                <button type="button"
                  onClick={() => itemFields.length > 1 && removeItem(idx)}
                  disabled={itemFields.length === 1}
                  aria-label={`Eliminar ítem ${idx + 1}`}
                  className="flex items-center justify-center p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}

            {/* Resumen desglosado completo */}
            <div className="bg-gray-50 rounded-lg p-4 mt-4 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Total no sujeto</span>
                <span className="font-mono">{formatMonto(totales.totalNoSuj)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Total exento</span>
                <span className="font-mono">{formatMonto(totales.totalExenta)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span>Total gravado</span>
                <span className="font-mono">{formatMonto(totales.totalGravada)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal ventas</span>
                <span className="font-mono">{formatMonto(totales.subTotalVentas)}</span>
              </div>
              {totales.descuGravada > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span className="font-mono">−{formatMonto(totales.descuGravada)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span className="font-mono">{formatMonto(totales.subTotal)}</span>
              </div>
              {tipoDte !== '14' && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>IVA 13% (tributo 20)</span>
                  <span className="font-mono">{formatMonto(totales.ivaValor)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total a pagar</span>
                <span className="font-mono">{formatMonto(totales.totalPagar)}</span>
              </div>
              {totales.totalPagar > 0 && (
                <p className="text-xs text-gray-400 italic text-right mt-1">
                  {numeroALetras(totales.totalPagar)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 4. Condición y pagos */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Condición y forma de pago</h2>
          </div>
          <div className="card-body">
            {/* Condición */}
            <div className="flex gap-2 mb-4">
              {[{v:1,l:'Contado (1)'},{v:2,l:'Crédito (2)'},{v:3,l:'Otro (3)'}].map(({v,l}) => (
                <button key={v} type="button" onClick={() => setCondicion(v)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    condicion === v
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>{l}</button>
              ))}
            </div>

            {/* Cabecera pagos */}
            <div className="hidden sm:grid gap-2 pb-2 border-b border-gray-100 mb-3"
              style={{gridTemplateColumns:'1.8fr 1fr 1fr .9fr 1fr 32px'}}>
              {['Forma de pago','Monto','Referencia','Plazo','Período',''].map((h,i) => (
                <span key={i} className="text-xs text-gray-400 font-medium uppercase tracking-wide">{h}</span>
              ))}
            </div>

            {pagoFields.map((field, idx) => (
              <div key={field.id}
                className="sm:grid gap-2 mb-3 space-y-2 sm:space-y-0 items-end"
                style={{gridTemplateColumns:'1.8fr 1fr 1fr .9fr 1fr 32px'}}>

                <div>
                  <label className="label sm:hidden">Forma de pago *</label>
                  <select className="input text-sm" {...register(`pagos.${idx}.codigo`)}>
                    {FORMAS_PAGO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label sm:hidden">Monto *</label>
                  <input type="number" min="0.01" step="0.01"
                    className="input input-number text-sm text-right"
                    {...register(`pagos.${idx}.montoPago`)} />
                  {errors.pagos?.[idx]?.montoPago && (
                    <p className="error-msg text-xs">{errors.pagos[idx].montoPago.message}</p>
                  )}
                </div>
                <div>
                  <label className="label sm:hidden">Referencia</label>
                  <input type="text" className="input text-sm"
                    placeholder="Núm. transacción..."
                    {...register(`pagos.${idx}.referencia`)} />
                </div>
                <div>
                  <label className="label sm:hidden">Plazo</label>
                  <select className="input text-sm"
                    disabled={!isCreditoActivo}
                    {...register(`pagos.${idx}.plazo`)}>
                    <option value="">— plazo —</option>
                    {PLAZOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  {!isCreditoActivo && <DisabledNote msg="solo crédito" />}
                </div>
                <div>
                  <label className="label sm:hidden">Período</label>
                  <input type="number" min="1" step="1"
                    className="input input-number text-sm"
                    placeholder="Ej: 30"
                    disabled={!isCreditoActivo}
                    {...register(`pagos.${idx}.periodo`)} />
                  {!isCreditoActivo && <DisabledNote msg="solo crédito" />}
                </div>
                <button type="button"
                  onClick={() => pagoFields.length > 1 && removePago(idx)}
                  disabled={pagoFields.length === 1}
                  aria-label={`Eliminar pago ${idx + 1}`}
                  className="flex items-center justify-center p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}

            <button type="button"
              onClick={() => appendPago({ ...PAGO_VACIO })}
              className="flex items-center gap-1.5 text-xs text-primary-600 mt-2 font-medium">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Agregar otra forma de pago
            </button>
          </div>
        </div>

        {/* 5. Extensión */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">
              Extensión
              <span className="text-xs font-normal text-gray-400 ml-2">
                opcional — para talleres, facturas con entrega física
              </span>
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre quien entrega">
              <input type="text" className="input"
                placeholder="Nombre completo" {...register('ext_nomb_entrega')} />
            </Field>
            <Field label="Nombre quien recibe">
              <input type="text" className="input"
                placeholder="Nombre completo" {...register('ext_nomb_recibe')} />
            </Field>
            <Field label="Placa de vehículo">
              <input type="text" className="input font-mono"
                placeholder="P86B78" {...register('ext_placa')} />
            </Field>
            <Field label="Observaciones">
              <input type="text" className="input"
                placeholder="Notas adicionales..." {...register('ext_observaciones')} />
            </Field>
          </div>
        </div>

        {/* 6. Firma */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Firma electrónica</h2>
          </div>
          <div className="card-body">
            <div className="max-w-sm">
              <Field label="Contraseña de firma (passwordPri)" req
                error={errors.password_pri?.message}>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'}
                    autoComplete="off"
                    placeholder="Contraseña del certificado"
                    className={`input pr-10 ${errors.password_pri ? 'input-error' : ''}`}
                    {...register('password_pri')} />
                  <button type="button"
                    aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPwd
                      ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                      : <Eye    className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </Field>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" aria-hidden="true" />
                No se almacena — solo se usa para firmar este documento
              </p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/dtes')}
            className="btn-secondary" disabled={isLoading}>
            Cancelar
          </button>
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Emitiendo...</>
              : 'Emitir DTE'
            }
          </button>
        </div>

      </form>
    </div>
  );
};

export default DTEEmitir;
