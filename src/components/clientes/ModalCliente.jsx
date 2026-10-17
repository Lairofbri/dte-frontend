// src/components/clientes/ModalCliente.jsx
// Alta / edición de clientes (receptores DTE) — El Salvador.
//
// Reglas de identificación:
//   Persona natural  → DUI o NIT (documentos homologados)
//   Persona jurídica → NIT (una empresa no tiene DUI)
//   Sujeto excluido  → DUI (no es empresa; factura FSE-14)
//
// UI: shadcn/ui (Dialog + Field + Select) sobre Tailwind, responsive y con
// secciones que se adaptan al tipo de cliente seleccionado.

import { useEffect, useId, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BadgeCheck, ChevronDown, IdCard, Loader2, MapPin, Phone, Sparkles,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Badge } from '@/components/shadcn/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/shadcn/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/shadcn/collapsible';
import {
  Field, FieldContent, FieldDescription, FieldError, FieldLabel,
} from '@/components/shadcn/field';

import { useTerritorio } from '../../hooks/useTerritorio';
import { useTiposDocumento } from '../../hooks/useTiposDocumento';
import { aplicarMascara } from '../../utils/mascaras';
import TipoClienteSelector from './TipoClienteSelector';
import {
  DOC_DUI, DOC_NIT, ETIQUETA_DOC, getTipoCliente,
  maskPorTipoDocumento, esDocumentoEstructurado,
} from './tiposCliente';

const DEPARTAMENTOS = [
  { cod: '01', nombre: 'Ahuachapán' },
  { cod: '02', nombre: 'Santa Ana' },
  { cod: '03', nombre: 'Sonsonate' },
  { cod: '04', nombre: 'Chalatenango' },
  { cod: '05', nombre: 'La Libertad' },
  { cod: '06', nombre: 'San Salvador' },
  { cod: '07', nombre: 'Cuscatlán' },
  { cod: '08', nombre: 'La Paz' },
  { cod: '09', nombre: 'Cabañas' },
  { cod: '10', nombre: 'San Vicente' },
  { cod: '11', nombre: 'Usulután' },
  { cod: '12', nombre: 'San Miguel' },
  { cod: '13', nombre: 'Morazán' },
  { cod: '14', nombre: 'La Unión' },
];

const RE_NIT = /^\d{4}-\d{6}-\d{3}-\d{1}$/;
const RE_NRC = /^\d{1,7}(-\d)?$/;
const RE_DUI = /^\d{8}-\d$/;

const schema = z.object({
  tipo_cliente:     z.enum(['natural', 'juridico', 'sujeto_excluido']),
  nombre:           z.string().min(1, 'El nombre es requerido.').max(250),
  nombre_comercial: z.string().max(150).optional().or(z.literal('')),
  tipo_documento:   z.string().optional().nullable(),
  num_documento:    z.string().max(30).optional().or(z.literal('')),
  nit:              z.string().optional().or(z.literal('')),
  nrc:              z.string().optional().or(z.literal('')),
  cod_actividad:    z.string().max(6).optional().or(z.literal('')),
  desc_actividad:   z.string().max(500).optional().or(z.literal('')),
  departamento_cod: z.string().optional().nullable(),
  municipio_cod:    z.string().optional().or(z.literal('')),
  distrito_cod:     z.string().optional().or(z.literal('')),
  direccion:        z.string().max(250).optional().or(z.literal('')),
  telefono:         z.string().optional().or(z.literal('')),
  correo:           z.string().email('Email inválido.').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const issue = (message, path) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });

  // Valida el número según el código CAT-022: 13=DUI, 36=NIT, resto texto libre
  // (pasaporte, carnet de residente, otro).
  const validarDocumento = (codigo, valor, path) => {
    const num = valor?.trim();
    if (!num) return;
    if (codigo === DOC_DUI) {
      if (!RE_DUI.test(num)) issue('Formato de DUI: 00000000-0', [path]);
    } else if (codigo === DOC_NIT) {
      if (!RE_NIT.test(num)) issue('Formato de NIT: 0000-000000-000-0', [path]);
    } else if (num.length < 3 || num.length > 30) {
      issue('El documento debe tener entre 3 y 30 caracteres.', [path]);
    }
  };

  // ── Persona jurídica: NIT + NRC + actividad (Hacienda CCF) ──
  if (data.tipo_cliente === 'juridico') {
    if (!data.nit?.trim()) issue('El NIT es obligatorio para clientes jurídicos.', ['nit']);
    else if (!RE_NIT.test(data.nit.trim())) issue('Formato requerido: 0000-000000-000-0', ['nit']);

    if (!data.nrc?.trim()) issue('El NRC es obligatorio. Hacienda lo exige en CCF.', ['nrc']);
    else if (!RE_NRC.test(data.nrc.trim())) issue('Formato: 0000000 o 0000000-0', ['nrc']);

    if (!data.cod_actividad?.trim()) issue('El código de actividad es obligatorio.', ['cod_actividad']);
    if (!data.desc_actividad?.trim()) issue('La descripción de actividad es obligatoria.', ['desc_actividad']);
  }

  // ── Sujeto excluido: persona (no empresa) → documento de identidad ──
  if (data.tipo_cliente === 'sujeto_excluido') {
    if (!data.num_documento?.trim()) {
      issue('El número de documento del sujeto excluido es obligatorio.', ['num_documento']);
    } else {
      validarDocumento(data.tipo_documento || DOC_DUI, data.num_documento, 'num_documento');
    }
  }

  // ── Persona natural: DUI o NIT homologados (u otro doc CAT-022) ──
  if (data.tipo_cliente === 'natural') {
    if (data.num_documento?.trim()) {
      if (!data.tipo_documento) {
        issue('Selecciona el tipo de documento.', ['tipo_documento']);
      } else {
        validarDocumento(data.tipo_documento, data.num_documento, 'num_documento');
      }
    }
    if (data.nit?.trim() && !RE_NIT.test(data.nit.trim())) {
      issue('Formato de NIT: 0000-000000-000-0', ['nit']);
    }
  }

  // NRC genérico (natural contribuyente)
  if (data.nrc?.trim() && !RE_NRC.test(data.nrc.trim())) {
    issue('Formato de NRC: 0000000 o 0000000-0', ['nrc']);
  }

  // Dirección fiscal del receptor: departamento + municipio + distrito juntos
  // (CAT-013/CAT-008) — el MH exige los tres completos cuando se envía.
  const alguno = !!(data.departamento_cod || data.municipio_cod?.trim() || data.distrito_cod?.trim());
  const todos  = !!(data.departamento_cod && data.municipio_cod?.trim() && data.distrito_cod?.trim());
  if (alguno && !todos) {
    issue('Completá departamento, municipio y distrito (catálogos Hacienda).', ['municipio_cod']);
  }
});

// ── Campo shadcn reutilizable (label + control + error + nota) ──
const Campo = ({ label, req, error, note, htmlFor, className, children }) => (
  <Field data-invalid={!!error} className={cn('gap-2', className)}>
    {label && (
      <FieldLabel htmlFor={htmlFor}>
        {label}
        {req && <span className="text-destructive" aria-hidden="true"> *</span>}
      </FieldLabel>
    )}
    <FieldContent>
      {children}
      {note && !error && <FieldDescription>{note}</FieldDescription>}
      {error && <FieldError errors={[error]} />}
    </FieldContent>
  </Field>
);

const SectionTitle = ({ icon: Icono, children }) => (
  <div className="flex items-center gap-2">
    <span className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Icono className="size-3.5" aria-hidden="true" />
    </span>
    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">{children}</h3>
  </div>
);

// ── Inputs ligados a react-hook-form ──
const CampoTexto = ({ control, name, ...props }) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <Input
        {...props}
        name={field.name}
        ref={field.ref}
        value={field.value ?? ''}
        onBlur={field.onBlur}
        onChange={field.onChange}
      />
    )}
  />
);

const CampoMascara = ({ control, name, mask, invalid, ...props }) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <Input
        {...props}
        name={field.name}
        ref={field.ref}
        value={field.value ?? ''}
        aria-invalid={invalid || undefined}
        onBlur={field.onBlur}
        onChange={(e) => field.onChange(aplicarMascara(mask, e.target.value))}
      />
    )}
  />
);

const CampoSelect = ({ control, name, placeholder, options, disabled, invalid, onCambio }) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <Select
        value={field.value ? String(field.value) : undefined}
        onValueChange={(v) => {
          field.onChange(v);
          onCambio?.(v);
        }}
        disabled={disabled}
      >
        <SelectTrigger aria-invalid={invalid || undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  />
);

const ModalCliente = ({ isOpen, onClose, onGuardar, cliente = null, semilla = null }) => {
  const modoEdicion = !!cliente;
  const uid = useId();
  const [errorApi, setErrorApi] = useState('');

  const {
    control, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { tipo_cliente: 'natural', tipo_documento: DOC_DUI },
  });

  const tipoCliente   = useWatch({ control, name: 'tipo_cliente' }) || 'natural';
  const nombre        = useWatch({ control, name: 'nombre' });
  const numDocumento  = useWatch({ control, name: 'num_documento' });
  const tipoDocumento = useWatch({ control, name: 'tipo_documento' });
  const nitValor      = useWatch({ control, name: 'nit' });
  const depCod        = useWatch({ control, name: 'departamento_cod' });

  const esJuridico = tipoCliente === 'juridico';
  const esNatural  = tipoCliente === 'natural';
  const esExcluido = tipoCliente === 'sujeto_excluido';
  const esDocumentoFisico = esNatural || esExcluido;

  const tipoClienteMeta = getTipoCliente(tipoCliente);
  const TipoIcono = tipoClienteMeta.icono;

  // Código CAT-022 efectivo del documento principal (por defecto DUI)
  const codigoDocumento = tipoDocumento || DOC_DUI;
  const maskDocumento = maskPorTipoDocumento(codigoDocumento);
  const placeholderDocumento = codigoDocumento === DOC_NIT
    ? '0000-000000-000-0'
    : codigoDocumento === DOC_DUI
      ? '00000000-0'
      : 'Número de documento';
  const notaDocumento = esDocumentoEstructurado(codigoDocumento)
    ? (codigoDocumento === DOC_NIT ? 'Formato: 0000-000000-000-0' : 'Formato: 00000000-0')
    : 'Pasaporte, carnet u otro documento (3-30 caracteres)';

  // Catálogo oficial CAT-022 (tipo de documento de identificación) desde la BD
  const {
    tiposDocumento,
    cargando: cargandoDocs,
    error: errorDocs,
  } = useTiposDocumento();

  // Catálogos territoriales oficiales del departamento (CAT-013/CAT-008)
  const {
    municipios, distritos,
    cargando: cargandoTerritorio,
    error: errorTerritorio,
  } = useTerritorio(depCod);

  useEffect(() => {
    if (!isOpen) return;
    queueMicrotask(() => {
      setErrorApi('');
      reset({
        tipo_cliente:     cliente?.tipo_cliente     ?? semilla?.tipo_cliente ?? 'natural',
        nombre:           cliente?.nombre           ?? semilla?.nombre       ?? '',
        nombre_comercial: cliente?.nombre_comercial ?? '',
        tipo_documento:   cliente?.tipo_documento   ?? (cliente ? null : DOC_DUI),
        num_documento:    cliente?.num_documento    ?? '',
        nit:              cliente?.nit              ?? '',
        nrc:              cliente?.nrc              ?? '',
        cod_actividad:    cliente?.cod_actividad    ?? '',
        desc_actividad:   cliente?.desc_actividad   ?? '',
        departamento_cod: cliente?.departamento_cod ?? null,
        municipio_cod:    cliente?.municipio_cod    ?? '',
        distrito_cod:     cliente?.distrito_cod     ?? '',
        direccion:        cliente?.direccion        ?? '',
        telefono:         cliente?.telefono         ?? '',
        correo:           cliente?.correo           ?? '',
      });
    });
  }, [isOpen, cliente, semilla?.nombre, semilla?.tipo_cliente, reset]);

  // Preview del encabezado con el que aparecerá en el buscador de DTE
  const previewDoc = (() => {
    if (esJuridico) return nitValor?.trim() ? `NIT ${nitValor}` : '';
    if (numDocumento?.trim()) return `${ETIQUETA_DOC[tipoDocumento] || 'Doc.'} ${numDocumento}`;
    if (nitValor?.trim()) return `NIT ${nitValor}`;
    return '';
  })();

  const onSubmit = async (datos) => {
    setErrorApi('');
    const payload = { ...datos };

    if (payload.tipo_cliente === 'juridico') {
      // Una empresa no tiene DUI
      payload.tipo_documento = null;
      payload.num_documento = null;
    } else if (payload.tipo_cliente === 'sujeto_excluido') {
      // Sujeto excluido: persona → documento de identidad (DUI por defecto)
      payload.tipo_documento = payload.tipo_documento || DOC_DUI;
      payload.nit = null;
      payload.nrc = null;
      payload.cod_actividad = null;
      payload.desc_actividad = null;
    } else if (payload.tipo_documento === DOC_NIT && payload.num_documento) {
      // Persona natural identificada con NIT (homologado con el DUI)
      payload.nit = payload.num_documento;
    }

    // Strings vacíos → null
    for (const k of Object.keys(payload)) {
      if (payload[k] === '') payload[k] = null;
    }

    try {
      await onGuardar(payload);
      onClose();
    } catch (err) {
      setErrorApi(err.response?.data?.mensaje || 'No se pudo guardar el cliente.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="w-[calc(100vw-1.5rem)] max-w-5xl gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-h-[92dvh] flex-col">
          {/* ── Encabezado ── */}
          <div className="relative shrink-0 overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-background px-6 py-5 pr-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-24 size-52 rounded-full bg-primary/20 blur-3xl"
            />
            <div className="relative flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  {modoEdicion ? 'Editar cliente' : 'Nuevo cliente'}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-sm">
                  {modoEdicion
                    ? 'Actualizá los datos del receptor. Los cambios se reflejan al emitir DTEs.'
                    : 'Registrá un receptor para autocompletar tus DTEs.'}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* ── Cuerpo ── */}
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* Columna: tipo + preview */}
            <aside className="space-y-4 border-b bg-muted/30 p-5 lg:border-b-0 lg:border-r">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tipo de cliente
                </p>
                <TipoClienteSelector
                  valor={tipoCliente}
                  onChange={(v) => {
                    setValue('tipo_cliente', v, { shouldValidate: true });
                    if (v === 'sujeto_excluido') setValue('tipo_documento', DOC_DUI);
                    if (v === 'natural' && !tipoDocumento) setValue('tipo_documento', DOC_DUI);
                  }}
                />
              </div>

              {/* Preview del selector de DTE */}
              <div className="rounded-xl border bg-background/70 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  Así aparecerá en el buscador
                </div>
                <div className="flex items-center gap-2">
                  <TipoIcono className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="truncate text-sm font-medium text-foreground">
                    {nombre?.trim() || 'Nombre del cliente'}
                    {previewDoc && (
                      <span className="text-muted-foreground"> — {previewDoc}</span>
                    )}
                  </p>
                </div>
              </div>
            </aside>

            {/* Columna: formulario */}
            <div className="space-y-6 p-5">
              {errorApi && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                  <p className="text-sm text-destructive" role="alert">{errorApi}</p>
                </div>
              )}

              {/* Datos generales */}
              <section className="space-y-4">
                <SectionTitle icon={TipoIcono}>Datos generales</SectionTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo
                    label="Nombre / razón social"
                    req
                    htmlFor={`${uid}-nombre`}
                    error={errors.nombre?.message}
                    className="sm:col-span-2"
                  >
                    <CampoTexto
                      control={control}
                      name="nombre"
                      id={`${uid}-nombre`}
                      placeholder={esJuridico ? 'Razón social de la empresa' : 'Nombre completo'}
                      aria-invalid={!!errors.nombre || undefined}
                    />
                  </Campo>
                  <Campo label="Nombre comercial" htmlFor={`${uid}-comercial`} className="sm:col-span-2">
                    <CampoTexto
                      control={control}
                      name="nombre_comercial"
                      id={`${uid}-comercial`}
                      placeholder="Opcional"
                    />
                  </Campo>
                </div>
              </section>

              {/* Identificación */}
              <section className="space-y-4">
                <SectionTitle icon={IdCard}>
                  Identificación
                  <Badge variant="secondary" className="font-normal">
                    {tipoClienteMeta.descripcion}
                  </Badge>
                </SectionTitle>

                {/* Natural / Sujeto excluido: documento de identidad */}
                {esDocumentoFisico && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                    <Campo
                      label="Tipo de documento"
                      req={esExcluido}
                      error={errors.tipo_documento?.message}
                      note={
                        errorDocs
                          ? 'No se pudo cargar el catálogo CAT-022. Reintentá.'
                          : (cargandoDocs ? 'Cargando catálogo…' : undefined)
                      }
                    >
                      <CampoSelect
                        control={control}
                        name="tipo_documento"
                        placeholder={cargandoDocs ? 'Cargando catálogo…' : 'Seleccionar...'}
                        options={tiposDocumento}
                        disabled={cargandoDocs || errorDocs}
                        invalid={!!errors.tipo_documento}
                      />
                    </Campo>

                    <Campo
                      label="Número de documento"
                      req={esExcluido || !!numDocumento?.trim()}
                      htmlFor={`${uid}-numdoc`}
                      error={errors.num_documento?.message}
                      note={notaDocumento}
                    >
                      <CampoMascara
                        control={control}
                        name="num_documento"
                        mask={maskDocumento}
                        id={`${uid}-numdoc`}
                        className="font-mono"
                        placeholder={placeholderDocumento}
                        invalid={!!errors.num_documento}
                      />
                    </Campo>
                  </div>
                )}

                {/* Jurídica: NIT + NRC + actividad */}
                {esJuridico && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Campo label="NIT" req htmlFor={`${uid}-nit`} error={errors.nit?.message}>
                      <CampoMascara
                        control={control}
                        name="nit"
                        mask="nit"
                        id={`${uid}-nit`}
                        className="font-mono"
                        placeholder="0000-000000-000-0"
                        invalid={!!errors.nit}
                      />
                    </Campo>
                    <Campo
                      label="NRC"
                      req
                      htmlFor={`${uid}-nrc`}
                      error={errors.nrc?.message}
                      note="Requerido por Hacienda para emitir CCF"
                    >
                      <CampoMascara
                        control={control}
                        name="nrc"
                        mask="nrc"
                        id={`${uid}-nrc`}
                        className="font-mono"
                        placeholder="000000-0"
                        invalid={!!errors.nrc}
                      />
                    </Campo>
                    <Campo
                      label="Código de actividad económica"
                      req
                      htmlFor={`${uid}-codact`}
                      error={errors.cod_actividad?.message}
                    >
                      <CampoTexto
                        control={control}
                        name="cod_actividad"
                        id={`${uid}-codact`}
                        className="font-mono"
                        placeholder="00000"
                        aria-invalid={!!errors.cod_actividad || undefined}
                      />
                    </Campo>
                    <Campo
                      label="Descripción de actividad"
                      req
                      htmlFor={`${uid}-descact`}
                      error={errors.desc_actividad?.message}
                    >
                      <CampoTexto
                        control={control}
                        name="desc_actividad"
                        id={`${uid}-descact`}
                        placeholder="Ej: Venta al por mayor de alimentos"
                        aria-invalid={!!errors.desc_actividad || undefined}
                      />
                    </Campo>
                  </div>
                )}

                {/* Natural: datos fiscales opcionales (CCF) */}
                {esNatural && (
                  <Collapsible className="rounded-xl border bg-muted/20 p-3">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="group flex w-full items-center justify-between text-sm font-medium text-foreground"
                      >
                        <span className="flex items-center gap-2">
                          <BadgeCheck className="size-4 text-muted-foreground" aria-hidden="true" />
                          Datos fiscales <span className="font-normal text-muted-foreground">(opcional)</span>
                        </span>
                        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                      {tipoDocumento !== DOC_NIT && (
                        <Campo
                          label="NIT"
                          htmlFor={`${uid}-nit-nat`}
                          error={errors.nit?.message}
                          note="Solo si la persona natural también es contribuyente"
                        >
                          <CampoMascara
                            control={control}
                            name="nit"
                            mask="nit"
                            id={`${uid}-nit-nat`}
                            className="font-mono"
                            placeholder="0000-000000-000-0"
                            invalid={!!errors.nit}
                          />
                        </Campo>
                      )}
                      <Campo label="NRC" htmlFor={`${uid}-nrc-nat`} error={errors.nrc?.message}>
                        <CampoMascara
                          control={control}
                          name="nrc"
                          mask="nrc"
                          id={`${uid}-nrc-nat`}
                          className="font-mono"
                          placeholder="000000-0"
                          invalid={!!errors.nrc}
                        />
                      </Campo>
                      <Campo label="Código de actividad económica" htmlFor={`${uid}-codact-nat`}>
                        <CampoTexto
                          control={control}
                          name="cod_actividad"
                          id={`${uid}-codact-nat`}
                          className="font-mono"
                          placeholder="00000"
                        />
                      </Campo>
                      <Campo label="Descripción de actividad" htmlFor={`${uid}-descact-nat`}>
                        <CampoTexto
                          control={control}
                          name="desc_actividad"
                          id={`${uid}-descact-nat`}
                          placeholder="Ej: Servicios profesionales"
                        />
                      </Campo>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </section>

              {/* Dirección */}
              <section className="space-y-4">
                <SectionTitle icon={MapPin}>Dirección</SectionTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="Departamento" error={errors.departamento_cod?.message}>
                    <CampoSelect
                      control={control}
                      name="departamento_cod"
                      placeholder="Seleccionar..."
                      options={DEPARTAMENTOS.map((d) => ({ value: d.cod, label: d.nombre }))}
                      invalid={!!errors.departamento_cod}
                      onCambio={() => {
                        setValue('municipio_cod', '');
                        setValue('distrito_cod', '');
                      }}
                    />
                  </Campo>
                  <Campo
                    label="Municipio (CAT-013)"
                    error={errors.municipio_cod?.message}
                    note={
                      !depCod
                        ? 'Seleccioná el departamento primero'
                        : errorTerritorio
                          ? 'No se pudo cargar el catálogo. Reintentá.'
                          : undefined
                    }
                  >
                    <CampoSelect
                      control={control}
                      name="municipio_cod"
                      placeholder={cargandoTerritorio ? 'Cargando catálogo…' : 'Seleccionar...'}
                      options={municipios}
                      disabled={!depCod || cargandoTerritorio}
                      invalid={!!errors.municipio_cod}
                    />
                  </Campo>
                  <Campo
                    label="Distrito (CAT-008)"
                    error={errors.distrito_cod?.message}
                    note={depCod ? 'Municipios antiguos (ej: San Salvador = 14)' : undefined}
                  >
                    <CampoSelect
                      control={control}
                      name="distrito_cod"
                      placeholder={cargandoTerritorio ? 'Cargando catálogo…' : 'Seleccionar...'}
                      options={distritos}
                      disabled={!depCod || cargandoTerritorio}
                      invalid={!!errors.distrito_cod}
                    />
                  </Campo>
                  <Campo label="Dirección (complemento)" htmlFor={`${uid}-dir`}>
                    <CampoTexto
                      control={control}
                      name="direccion"
                      id={`${uid}-dir`}
                      placeholder="Calle, colonia, número de casa..."
                    />
                  </Campo>
                </div>
              </section>

              {/* Contacto */}
              <section className="space-y-4">
                <SectionTitle icon={Phone}>Contacto</SectionTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo label="Teléfono" htmlFor={`${uid}-tel`}>
                    <CampoMascara
                      control={control}
                      name="telefono"
                      mask="telefono"
                      id={`${uid}-tel`}
                      placeholder="0000-0000"
                    />
                  </Campo>
                  <Campo label="Correo electrónico" htmlFor={`${uid}-correo`} error={errors.correo?.message}>
                    <CampoTexto
                      control={control}
                      name="correo"
                      id={`${uid}-correo`}
                      type="email"
                      placeholder="correo@empresa.com"
                      aria-invalid={!!errors.correo || undefined}
                    />
                  </Campo>
                </div>
              </section>
            </div>
          </div>

          {/* ── Pie ── */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t bg-background px-5 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {modoEdicion ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModalCliente;
