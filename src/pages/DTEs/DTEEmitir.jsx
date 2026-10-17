// src/pages/DTEs/DTEEmitir.jsx
// Wizard de emisión de DTEs (FCF, CCF, FSE, NC, ND) en 5 pasos:
//   1. Tipo de documento → 2. Receptor → 3. Ítems → 4. Pago → 5. Resumen y firma
// Validación por paso con react-hook-form + zod y totales siempre visibles.

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

import { Alert, AlertTitle } from '../../components/shadcn/alert';
import { Button } from '../../components/shadcn/button';
import { useEmitirDTE } from '../../hooks/useEmitirDTE';
import { useCatalogosUI } from '../../hooks/useCatalogosUI';
import { calcularTotales } from '../../components/dtes/emitir/calcularTotales';
import EmitirStepper from '../../components/dtes/emitir/EmitirStepper';
import PanelTotales from '../../components/dtes/emitir/PanelTotales';
import Paso1Tipo from '../../components/dtes/emitir/Paso1Tipo';
import Paso2Receptor from '../../components/dtes/emitir/Paso2Receptor';
import Paso3Items, { ITEM_VACIO } from '../../components/dtes/emitir/Paso3Items';
import Paso4Pago, { PAGO_VACIO } from '../../components/dtes/emitir/Paso4Pago';
import Paso5Resumen from '../../components/dtes/emitir/Paso5Resumen';

// ─────────────────────────────────────────────
// SCHEMAS ZOD — por tipo de DTE (estructura Hacienda v2/v3/v4)
// ─────────────────────────────────────────────
const itemSchema = z.object({
  descripcion:     z.string().min(1, 'Descripción requerida.'),
  codigo:          z.string().max(25).optional().or(z.literal('')),
  tipo_item:       z.coerce.number().int().min(1).max(4).default(2),
  uni_medida:      z.coerce.number().int().min(1).max(99).default(59),
  cantidad:        z.coerce.number().positive('Debe ser mayor a 0.'),
  precio_unitario: z.coerce.number().positive('Debe ser mayor a 0.'),
  descuento_pct:   z.coerce.number().min(0).max(99.99).default(0),
  venta_no_suj:    z.coerce.number().min(0).default(0),
  venta_exenta:    z.coerce.number().min(0).default(0),
  compra:          z.coerce.number().min(0).default(0),
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
  tipo_dte:            z.enum(['01', '03', '14', '05', '06']),
  condicion_operacion: z.coerce.number().int().min(1).max(3).default(1),
  items:               z.array(itemSchema).min(1, 'Agrega al menos un ítem.'),
  pagos:               z.array(pagoSchema).min(1, 'Agrega al menos una forma de pago.'),
  // NOTA: password_pri no es campo del frontend (firma interna, migración 030).
  // "extension" tampoco: el esquema oficial MH del DTE no la incluye, y el
  // backend Joi la rechaza ("... is not allowed").
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
  rec_distrito:      z.string().optional(),
});

const schemaFSE = schemaBase.extend({
  rec_nombre:   z.string().min(1, 'Nombre requerido.'),
  // Sujeto excluido: DUI (13) o NIT (36) — la persona no es empresa.
  rec_tipo_doc: z.string().optional(),
  rec_num_doc:  z.string().optional().or(z.literal('')),
  rec_nit:      z.string().optional().or(z.literal('')),
  rec_correo:   z.string().email('Email inválido.').optional().or(z.literal('')),
  rec_telefono: z.string().optional().or(z.literal('')),
  observaciones: z.string().max(3000, 'Máximo 3000 caracteres.').optional().or(z.literal('')),
}).superRefine((d, ctx) => {
  const tipo = d.rec_tipo_doc || '13';
  const num  = d.rec_num_doc?.trim();
  const nit  = d.rec_nit?.trim();
  const addError = (path, message) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });

  if (!num && !nit) {
    addError(['rec_num_doc'], 'Ingresá el DUI (o NIT) del sujeto excluido.');
    return;
  }
  if (num) {
    if (tipo === '36' && !/^\d{4}-\d{6}-\d{3}-\d$/.test(num)) {
      addError(['rec_num_doc'], 'Formato de NIT: 0000-000000-000-0');
    } else if (tipo === '13' && !/^\d{8}-\d$/.test(num)) {
      addError(['rec_num_doc'], 'Formato de DUI: 00000000-0');
    } else if (tipo !== '36' && tipo !== '13' && (num.length < 3 || num.length > 20)) {
      addError(['rec_num_doc'], 'El documento debe tener entre 3 y 20 caracteres.');
    }
  } else if (nit && !/^\d{4}-\d{6}-\d{3}-\d$/.test(nit)) {
    addError(['rec_nit'], 'Formato de NIT: 0000-000000-000-0');
  }
});

// NC/ND: mismo receptor que CCF + documento_relacionado requerido
const schemaNCND = schemaBase.extend({
  rec_nombre:        z.string().min(1, 'Nombre del receptor requerido.'),
  rec_nit:           z.string().regex(/^\d{4}-\d{6}-\d{3}-\d$/, 'Formato: 0000-000000-000-0'),
  rec_nrc:           z.string().optional().or(z.literal('')),
  rec_cod_actividad: z.string().optional().or(z.literal('')),
  rec_desc_actividad: z.string().optional().or(z.literal('')),
  rec_correo:        z.string().email('Email inválido.').optional().or(z.literal('')),
  rec_telefono:      z.string().optional().or(z.literal('')),
  rec_depto:         z.string().optional(),
  rec_municipio:     z.string().optional(),
  rec_distrito:      z.string().optional(),
  doc_rel_codgen:    z.string().min(1, 'Selecciona el DTE relacionado.'),
  doc_rel_tipo:      z.string().min(1, 'Tipo de DTE requerido.'),
  doc_rel_fecha:     z.string().min(1, 'Fecha de emisión requerida.'),
  fusion:            z.string().optional().or(z.literal('')),
  observaciones:     z.string().max(3000, 'Máximo 3000 caracteres.').optional().or(z.literal('')),
}).refine((d) => {
  if (isNaN(Date.parse(d.doc_rel_fecha))) return false;
  const fecha = new Date(d.doc_rel_fecha);
  return fecha <= new Date();
}, { message: 'La fecha no puede ser futura.', path: ['doc_rel_fecha'] });

const getSchema = (t) => {
  if (t === '03')               return schemaCCF;
  if (t === '14')               return schemaFSE;
  if (t === '05' || t === '06') return schemaNCND;
  return schemaFCF;
};

// ── Footer de navegación (pasos 1-4) ──
const FooterPasos = ({ paso, onIrAPaso, isLoading }) => (
  <div className="flex items-center justify-between gap-3 border-t pt-4">
    <Button
      type="button"
      variant="ghost"
      onClick={() => onIrAPaso(paso - 1)}
      disabled={paso === 1 || isLoading}
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      Atrás
    </Button>
    <Button type="submit" disabled={isLoading}>
      Continuar
      <ChevronRight className="size-4" aria-hidden="true" />
    </Button>
  </div>
);

const DTEEmitir = () => {
  const navigate = useNavigate();
  const { emitir } = useEmitirDTE();

  // ── Estado del wizard ──
  const [paso, setPaso] = useState(1);
  const [maxPasoAlcanzado, setMaxPasoAlcanzado] = useState(1);

  const [isLoading, setIsLoading]     = useState(false);
  const [tipoDte,   setTipoDte]       = useState('01');
  const [condicion, setCondicion]     = useState(1);
  const [errorApi,  setErrorApi]      = useState('');
  const [clienteId, setClienteId]     = useState(null);
  const [fcfConDatos, setFcfConDatos] = useState(false);

  const { unidades, formasPago, tiposItem, tiposDoc, departamentos, plazos, error: errorCatalogos } = useCatalogosUI();

  const { register, control, handleSubmit, reset, setValue, trigger,
    formState: { errors } } = useForm({
    resolver: zodResolver(getSchema(tipoDte)),
    defaultValues: {
      tipo_dte: '01', condicion_operacion: 1,
      items: [ITEM_VACIO],
      pagos: [{ ...PAGO_VACIO }],
    },
    mode: 'onChange',
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } =
    useFieldArray({ control, name: 'items' });
  const { fields: pagoFields, append: appendPago, remove: removePago } =
    useFieldArray({ control, name: 'pagos' });

  const itemsActuales = useWatch({ control, name: 'items' }) ?? [];
  const totales       = calcularTotales(itemsActuales, tipoDte);
  const esCCF         = tipoDte === '03';
  const esFSE         = tipoDte === '14';
  const esNCND        = tipoDte === '05' || tipoDte === '06';

  const cambiarTipo = useCallback((t) => {
    setTipoDte(t);
    reset((v) => ({ ...v, tipo_dte: t }));
  }, [reset]);

  // ── Validación por paso ──
  const camposDelPaso = useCallback((p) => {
    if (p === 1) return [];
    if (p === 2) {
      const campos = [];
      if (tipoDte === '01') {
        campos.push('rec_nombre', 'rec_tipo_doc', 'rec_num_doc', 'rec_correo', 'rec_telefono');
      } else {
        campos.push('rec_nombre', 'rec_correo', 'rec_telefono');
        if (tipoDte === '14') {
          // Sujeto excluido: DUI o NIT
          campos.push('rec_tipo_doc', 'rec_num_doc', 'rec_nit', 'observaciones');
        } else {
          campos.push('rec_nit');
        }
        if (esCCF || esNCND) {
          campos.push('rec_nrc', 'rec_cod_actividad', 'rec_desc_actividad', 'rec_depto', 'rec_municipio', 'rec_distrito');
        }
      }
      if (esNCND) campos.push('doc_rel_codgen', 'doc_rel_tipo', 'doc_rel_fecha', 'fusion', 'observaciones');
      return campos;
    }
    if (p === 3) return ['items'];
    if (p === 4) return ['pagos'];
    return [];
  }, [tipoDte, esCCF, esNCND]);

  const validarPaso = useCallback(async (p) => {
    const campos = camposDelPaso(p);
    if (campos.length === 0) return true;
    return trigger(campos);
  }, [camposDelPaso, trigger]);

  const irAPaso = useCallback(async (p) => {
    if (p > maxPasoAlcanzado) return;
    setPaso(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [maxPasoAlcanzado]);

  const avanzar = useCallback(async () => {
    const valido = await validarPaso(paso);
    if (!valido) return;
    const siguiente = Math.min(paso + 1, 5);
    setPaso(siguiente);
    setMaxPasoAlcanzado((m) => Math.max(m, siguiente));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [paso, validarPaso]);

  // ── Selección de cliente guardado → llena el receptor ──
  const onSeleccionarCliente = useCallback((receptorCliente, id) => {
    setClienteId(id || null);
    if (!receptorCliente) return;
    if (tipoDte === '01') {
      if (receptorCliente.nombre)         setValue('rec_nombre', receptorCliente.nombre);
      if (receptorCliente.tipo_documento) setValue('rec_tipo_doc', receptorCliente.tipo_documento);
      if (receptorCliente.num_documento)  setValue('rec_num_doc', receptorCliente.num_documento);
      if (receptorCliente.correo)         setValue('rec_correo', receptorCliente.correo);
      if (receptorCliente.telefono)       setValue('rec_telefono', receptorCliente.telefono);
    } else {
      if (receptorCliente.nombre)          setValue('rec_nombre', receptorCliente.nombre);
      if (receptorCliente.tipo_documento)  setValue('rec_tipo_doc', receptorCliente.tipo_documento);
      if (receptorCliente.num_documento)   setValue('rec_num_doc', receptorCliente.num_documento);
      if (receptorCliente.nit)             setValue('rec_nit', receptorCliente.nit);
      if (receptorCliente.nrc)             setValue('rec_nrc', receptorCliente.nrc);
      if (receptorCliente.cod_actividad)   setValue('rec_cod_actividad', receptorCliente.cod_actividad);
      if (receptorCliente.desc_actividad)  setValue('rec_desc_actividad', receptorCliente.desc_actividad);
      if (receptorCliente.correo)          setValue('rec_correo', receptorCliente.correo);
      if (receptorCliente.telefono)        setValue('rec_telefono', receptorCliente.telefono);
      if (receptorCliente.departamento_cod) setValue('rec_depto', receptorCliente.departamento_cod);
      if (receptorCliente.municipio_cod)   setValue('rec_municipio', receptorCliente.municipio_cod);
      if (receptorCliente.distrito_cod)    setValue('rec_distrito', receptorCliente.distrito_cod);
    }
  }, [tipoDte, setValue]);

  // FCF: al volver a "Consumidor final" se limpian los datos del receptor
  const onSetFcfConDatos = useCallback((conDatos) => {
    setFcfConDatos(conDatos);
    if (!conDatos) {
      ['rec_nombre', 'rec_tipo_doc', 'rec_num_doc', 'rec_correo', 'rec_telefono']
        .forEach((campo) => setValue(campo, ''));
    }
  }, [setValue]);

  // ── Emisión ──
  const onSubmit = useCallback(async (datos) => {
    setIsLoading(true);
    setErrorApi('');
    try {
      let receptor = null;
      if (tipoDte === '01' && datos.rec_nombre) {
        receptor = {
          nombre:        datos.rec_nombre,
          tipo_documento: datos.rec_tipo_doc || null,
          num_documento:  datos.rec_num_doc  || null,
          correo:        datos.rec_correo    || null,
          telefono:      datos.rec_telefono  || null,
        };
      } else if (tipoDte === '03' || esNCND) {
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
          distrito_cod:   datos.rec_distrito       || null,
        };
      } else if (tipoDte === '14') {
        receptor = {
          tipo_documento: datos.rec_tipo_doc || '13',
          num_documento:  datos.rec_num_doc  || null,
          nit:            datos.rec_nit      || null,
          nombre:         datos.rec_nombre,
          correo:         datos.rec_correo   || null,
          telefono:       datos.rec_telefono || null,
        };
      }

      const documentoRelacionado = esNCND ? {
        codigo_generacion: datos.doc_rel_codgen,
        tipo_dte:          datos.doc_rel_tipo,
        fecha_emision:     datos.doc_rel_fecha,
      } : null;
      // NOTA: "extension" ya no se envía — el esquema oficial MH del DTE no la
      // incluye y el backend la rechaza. (Su soporte real requeriría backend.)

      await emitir({
        tipoDte,
        receptor,
        items:               datos.items,
        pagos:               datos.pagos,
        condicionOperacion:  condicion,
        clienteId,
        documentoRelacionado,
        fusion:              datos.fusion || null,
        observaciones:       datos.observaciones || null,
      });
    } catch (_) {
      const msg = _.response?.data?.mensaje || 'No se pudo emitir el DTE.';
      setErrorApi(msg);
    } finally {
      setIsLoading(false);
    }
  }, [tipoDte, condicion, esNCND, emitir, clienteId]);

  // Enter / botón Continuar → valida el paso actual; en el paso 5 emite
  const alEnviarForm = useCallback((e) => {
    e.preventDefault();
    if (paso === 5) {
      handleSubmit(onSubmit)();
      return;
    }
    avanzar();
  }, [paso, handleSubmit, avanzar, onSubmit]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/dtes')}
          className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Volver al listado"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al listado
        </button>
        <h1 className="page-title">Emitir DTE</h1>
        <p className="page-subtitle">
          Completá los pasos — los campos marcados con * son requeridos por Hacienda
        </p>
      </div>

      {errorApi && (
        <Alert variant="destructive">
          <AlertTitle className="text-sm">{errorApi}</AlertTitle>
        </Alert>
      )}

      <form onSubmit={alEnviarForm} noValidate className="space-y-4">
        <EmitirStepper
          pasoActual={paso}
          maxPasoAlcanzado={maxPasoAlcanzado}
          onIrAPaso={irAPaso}
          tipoDte={tipoDte}
        />

        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
          {/* Columna del paso */}
          <div className="space-y-4">
            {paso === 1 && (
              <div className="space-y-5 rounded-xl border bg-white p-5 shadow-card">
                <Paso1Tipo tipoDte={tipoDte} onChange={cambiarTipo} />
                <FooterPasos paso={paso} onIrAPaso={irAPaso} isLoading={isLoading} />
              </div>
            )}

            {paso === 2 && (
              <div className="space-y-5 rounded-xl border bg-white p-5 shadow-card">
                <Paso2Receptor
                  tipoDte={tipoDte}
                  esCCF={esCCF}
                  esFSE={esFSE}
                  esNCND={esNCND}
                  register={register}
                  errors={errors}
                  control={control}
                  setValue={setValue}
                  tiposDoc={tiposDoc}
                  departamentos={departamentos}
                  onSeleccionarCliente={onSeleccionarCliente}
                  fcfConDatos={fcfConDatos}
                  onSetFcfConDatos={onSetFcfConDatos}
                  totalesPagar={totales.totalPagar}
                />
                <FooterPasos paso={paso} onIrAPaso={irAPaso} isLoading={isLoading} />
              </div>
            )}

            {paso === 3 && (
              <div className="space-y-5 rounded-xl border bg-white p-5 shadow-card">
                <Paso3Items
                  register={register}
                  errors={errors}
                  control={control}
                  setValue={setValue}
                  itemFields={itemFields}
                  appendItem={appendItem}
                  removeItem={removeItem}
                  itemsActuales={itemsActuales}
                  tiposItem={tiposItem}
                  unidades={unidades}
                  esFSE={esFSE}
                  tipoDte={tipoDte}
                  totales={totales}
                />
                <FooterPasos paso={paso} onIrAPaso={irAPaso} isLoading={isLoading} />
              </div>
            )}

            {paso === 4 && (
              <div className="space-y-5 rounded-xl border bg-white p-5 shadow-card">
                <Paso4Pago
                  register={register}
                  errors={errors}
                  control={control}
                  setValue={setValue}
                  pagoFields={pagoFields}
                  appendPago={appendPago}
                  removePago={removePago}
                  condicion={condicion}
                  setCondicion={setCondicion}
                  totalPagar={totales.totalPagar}
                  formasPago={formasPago}
                  plazos={plazos}
                />
                <FooterPasos paso={paso} onIrAPaso={irAPaso} isLoading={isLoading} />
              </div>
            )}

            {paso === 5 && (
              <div className="space-y-5 rounded-xl border bg-white p-5 shadow-card">
                <Paso5Resumen
                  register={register}
                  errors={errors}
                  control={control}
                  totales={totales}
                  tipoDte={tipoDte}
                  itemsActuales={itemsActuales}
                  formasPago={formasPago}
                  fcfConDatos={fcfConDatos}
                  isLoading={isLoading}
                  onAtras={() => irAPaso(4)}
                  onCancelar={() => navigate('/dtes')}
                />
              </div>
            )}
          </div>

          {/* Columna lateral: totales siempre visibles (desktop) */}
          <aside className="hidden xl:block">
            <div className="sticky top-6 space-y-4">
              <PanelTotales totales={totales} tipoDte={tipoDte} items={itemsActuales} />
              {errorCatalogos && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No se pudieron cargar los catálogos de Hacienda. Algunos selectores pueden verse vacíos.
                </p>
              )}
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
};

export default DTEEmitir;