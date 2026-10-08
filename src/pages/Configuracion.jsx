// src/pages/Configuracion.jsx
// Configuración del emisor — solo administradores
// Layout de 2 columnas: formularios (datos del emisor + credenciales Hacienda)
// a la izquierda y estado de servicios en un rail derecho.
// Comboboxes con búsqueda (shadcn + catálogos CAT-019/CAT-009) y máscaras
// de formato implícitas (NIT/NRC/teléfono) que se guardan SIN guiones.

import { useState, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }                       from 'zod';
import { toast }                   from 'react-hot-toast';
import {
  AlertTriangle, Building2, CheckCircle,
  Eye, EyeOff, KeyRound, Loader2,
  RefreshCw, Save, Wifi, XCircle,
} from 'lucide-react';
import {
  obtenerConfiguracionApi,
  actualizarConfiguracionApi,
  actualizarPasswordFirmaApi,
  testFirmadorApi,
  testHaciendaApi,
  obtenerEstadoFirmaApi,
} from '../api/configuracion.api';
import { obtenerCatalogoApi } from '../api/catalogos.api';
import { obtenerEstadoProvisionApi } from '../api/provisioning.api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/shadcn/card';
import { Button } from '../components/shadcn/button';
import { Input } from '../components/shadcn/input';
import { Label } from '../components/shadcn/label';
import { Badge } from '../components/shadcn/badge';
import Combobox  from '../components/shadcn/combobox';
import MaskedInput from '../components/shadcn/MaskedInput';
import Spinner from '../components/ui/Spinner';
import { aplicarMascara, limpiarFormato } from '../utils/mascaras';

// ─────────────────────────────────────────────
// SCHEMAS DE VALIDACIÓN
// Datos del emisor y credenciales Hacienda se guardan por separado,
// cada sección con su propio formulario y botón Guardar.
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
  correo:           z.string().email('Correo inválido.').optional().or(z.literal('')),
  codigo_actividad: z.string().min(1, 'El código de actividad es requerido.'),
  tipo_establecimiento: z.string().min(1, 'El tipo de establecimiento es requerido.'),
});

// Credenciales Hacienda: sin restricciones de formato — la validez la
// verifica Hacienda al probar la conexión. Password vacío = no cambiar.
// password_firma: contraseña del certificado (passwordPri) POR TENANT —
// se guarda cifrada en BD, vacío = no cambiar, nunca se devuelve.
const credencialesSchema = z.object({
  usuario_hacienda:  z.string().optional(),
  password_hacienda: z.string().optional(),
  password_firma:    z.string().optional(),
});

// ─────────────────────────────────────────────
// SUBCOMPONENTES DE ESTADO
// ─────────────────────────────────────────────
const EstadoConexion = ({ estado }) => {
  if (estado === null) return null;
  if (estado === 'probando') return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
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

// Indicador de la prueba de conexión con Hacienda (Fase 4).
// El backend NUNCA devuelve el token — solo el resultado de la conexión.
const EstadoHacienda = ({ estado }) => {
  if (estado === null) return null;
  if (estado === 'probando') return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
      Probando...
    </span>
  );
  if (estado.ok) return (
    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
      <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
      Conexión exitosa
      {estado.ambiente ? ` · ${estado.ambiente === '01' ? 'Producción' : 'Pruebas'}` : ''}
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
      Error de conexión
    </span>
  );
};

// Estado de certificado/firma por tenant (Fase 4) — señales operativas,
// nunca contraseñas ni certificados.
const ESTADO_FIRMA_INFO = {
  listo:            { label: 'Listo',                cls: 'badge-firmado'    },
  firmador_offline: { label: 'Firmador sin conexión', cls: 'badge-rechazado' },
  sin_credencial:   { label: 'Sin credencial de firma', cls: 'badge-rechazado' },
};

const EstadoFirma = ({ estado }) => {
  if (estado === null) return null;
  if (estado === 'probando') return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
      Consultando...
    </span>
  );
  const info = ESTADO_FIRMA_INFO[estado.estado] || { label: estado.estado || 'Desconocido', cls: 'badge-rechazado' };
  return (
    <span className="flex items-center gap-2">
      <span className={`badge ${info.cls}`}>{info.label}</span>
      {estado.firmador_disponible === false && (
        <span className="text-xs text-red-500">Firmador offline</span>
      )}
      {estado.credencial_firma_disponible === false && (
        <span className="text-xs text-amber-600">Sin credencial</span>
      )}
    </span>
  );
};

const AvisoCambios = ({ visible }) =>
  visible ? (
    <p className="flex items-center gap-1.5 text-xs text-amber-600">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      Cambios sin guardar
    </p>
  ) : (
    <span className="text-xs text-muted-foreground">Sin cambios pendientes</span>
  );

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const Configuracion = () => {
  const [isLoading,        setIsLoading]        = useState(true);
  const [isSavingDatos,    setIsSavingDatos]    = useState(false);
  const [isSavingCreds,    setIsSavingCreds]    = useState(false);
  const [showPassword,     setShowPassword]     = useState(false);
  const [estadoFirmador,   setEstadoFirmador]   = useState(null);
  const [estadoHacienda,   setEstadoHacienda]   = useState(null);
  const [estadoFirma,      setEstadoFirma]      = useState(null);
  const [tieneApiKey,      setTieneApiKey]      = useState(null);
  const [esProduccion,     setEsProduccion]     = useState(false);
  const [error,            setError]            = useState(null);
  // Catálogos CAT-019 (actividades) y CAT-009 (tipo de establecimiento)
  const [actividades,        setActividades]        = useState([]);
  const [tiposEstablecimiento, setTiposEstablecimiento] = useState([]);
  const [errorCatalogo,      setErrorCatalogo]      = useState(false);
  // Valores guardados fuera del catálogo vigente (datos legados):
  // se muestran como opción visible, pero el backend exige elegir uno vigente.
  const [codigoLegado,     setCodigoLegado]     = useState(null);
  const [descLegado,       setDescLegado]       = useState(null);
  const [tipoLegado,       setTipoLegado]       = useState(null);

  // Todos los hooks ANTES de returns condicionales
  // Form 1 — Datos del emisor
  const {
    register: registerDatos,
    handleSubmit: handleSubmitDatos,
    reset: resetDatos,
    setValue: setValueDatos,
    control: controlDatos,
    formState: { errors: errorsDatos, isDirty: isDirtyDatos },
  } = useForm({
    resolver: zodResolver(configuracionSchema),
  });

  // Form 2 — Credenciales de Hacienda
  const {
    register: registerCredenciales,
    handleSubmit: handleSubmitCredenciales,
    reset: resetCredenciales,
    formState: { errors: errorsCredenciales, isDirty: isDirtyCredenciales },
  } = useForm({
    resolver: zodResolver(credencialesSchema),
  });

  // ── Opciones del combobox de actividad económica ──
  const opcionesActividad = useMemo(() => {
    const base = actividades.map((a) => ({
      value: a.codigo,
      label: `${a.codigo} — ${a.descripcion}`,
    }));
    if (!codigoLegado) return base;
    return [
      { value: codigoLegado, label: `${codigoLegado} — ${descLegado}` },
      ...base,
    ];
  }, [actividades, codigoLegado, descLegado]);
  const esCodigoLegado = codigoLegado !== null;

  // ── Opciones del combobox de tipo de establecimiento (CAT-009) ──
  const opcionesTipoEstablecimiento = useMemo(() => {
    const base = tiposEstablecimiento.map((t) => ({
      value: t.codigo,
      label: `${t.codigo} — ${t.descripcion}`,
    }));
    if (!tipoLegado) return base;
    return [
      { value: tipoLegado, label: `${tipoLegado} — (fuera del catálogo vigente)` },
      ...base,
    ];
  }, [tiposEstablecimiento, tipoLegado]);
  const esTipoLegado = tipoLegado !== null;

  // ── Cargar configuración al montar ──
  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      let config = null;
      try {
        config = await obtenerConfiguracionApi();
        if (!cancelado) {
          resetDatos({
            nombre:               config.nombre               ?? '',
            nombre_comercial:     config.nombre_comercial     ?? '',
            nit:                  aplicarMascara('nit', config.nit),
            nrc:                  aplicarMascara('nrc', config.nrc),
            direccion:            config.direccion            ?? '',
            telefono:             aplicarMascara('telefono', config.telefono),
            email:                config.email               ?? '',
            correo:               config.correo              ?? '',
            codigo_actividad:     config.codigo_actividad     ?? '',
            desc_actividad:       config.desc_actividad       ?? '',
            tipo_establecimiento: config.tipo_establecimiento ?? '02',
          });
          resetCredenciales({
            usuario_hacienda:  '',
            password_hacienda: '',  // NUNCA pre-rellenar — el backend no lo devuelve
            password_firma:    '',  // NUNCA pre-rellenar — el backend no lo devuelve
          });
          setEsProduccion(config.ambiente === '01');
        }
      } catch {
        if (!cancelado) setError('No se pudo cargar la configuración.');
      }

      // Catálogos CAT-019 y CAT-009 — opciones de los comboboxes
      try {
        const [listaActividades, listaTipos] = await Promise.all([
          obtenerCatalogoApi('actividad-economica'),
          obtenerCatalogoApi('tipo-establecimiento'),
        ]);
        if (!cancelado) {
          setActividades(listaActividades);
          setTiposEstablecimiento(listaTipos);
          // Valores guardados fuera del catálogo vigente (datos legados)
          if (
            config?.codigo_actividad &&
            !listaActividades.some((a) => a.codigo === config.codigo_actividad)
          ) {
            setCodigoLegado(config.codigo_actividad);
            setDescLegado(config.desc_actividad || 'Código fuera del catálogo vigente');
          }
          if (
            config?.tipo_establecimiento &&
            !listaTipos.some((t) => t.codigo === config.tipo_establecimiento)
          ) {
            setTipoLegado(config.tipo_establecimiento);
          }
        }
      } catch {
        if (!cancelado) setErrorCatalogo(true);
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };

    // Fase 4 — estado de firma por tenant y presencia de API Key técnica
    // (integración POS ↔ DTE). Señales separadas de las credenciales Hacienda.
    const cargarFirmaYApiKey = async () => {
      try {
        const firma = await obtenerEstadoFirmaApi();
        if (!cancelado) setEstadoFirma(firma);
      } catch {
        if (!cancelado) setEstadoFirma({ estado: 'firmador_offline', firmador_disponible: false, credencial_firma_disponible: false });
      }
      try {
        const tenants = await obtenerEstadoProvisionApi();
        const propio = tenants?.[0];
        if (!cancelado) setTieneApiKey(propio?.tiene_api_key ?? false);
      } catch {
        if (!cancelado) setTieneApiKey(null);
      }
    };

    cargar();
    cargarFirmaYApiKey();
    return () => { cancelado = true; };
  }, [resetDatos, resetCredenciales]);

  // ── Guardar datos del emisor ──
  // NIT/NRC/teléfono se normalizan a solo dígitos (Hacienda los recibe
  // sin guiones en el DTE); los guiones son solo presentación (máscara).
  const onSubmitDatos = async (datos) => {
    setIsSavingDatos(true);
    try {
      const payload = {
        ...datos,
        nit:      limpiarFormato(datos.nit),
        nrc:      limpiarFormato(datos.nrc),
        telefono: limpiarFormato(datos.telefono),
      };
      await actualizarConfiguracionApi(payload);
      toast.success('Datos del emisor guardados correctamente.');
      resetDatos(datos);
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || 'No se pudo guardar la configuración.';
      toast.error(mensaje);
    } finally {
      setIsSavingDatos(false);
    }
  };

  // ── Guardar credenciales de Hacienda ──
  // Sin restricciones de formato: la validez la verifica Hacienda al
  // probar la conexión. Password vacío = no cambiar.
  // password_firma: contraseña del certificado (passwordPri) POR TENANT,
  // se guarda CIFRADA en BD vía endpoint dedicado. Vacío = no cambiar.
  const onSubmitCredenciales = async (datos) => {
    setIsSavingCreds(true);
    try {
      const payload = { ...datos };
      if (!payload.password_hacienda?.trim()) {
        delete payload.password_hacienda;
      }
      await actualizarConfiguracionApi(payload);
      if (datos.password_firma?.trim()) {
        await actualizarPasswordFirmaApi({ password_firma: datos.password_firma });
      }
      toast.success('Credenciales guardadas correctamente.');
      // Limpiar passwords después de guardar — NUNCA dejarlos visibles en el formulario
      resetCredenciales({ usuario_hacienda: datos.usuario_hacienda ?? '', password_hacienda: '', password_firma: '' });
      // Refrescar el estado de firma (credencial_firma_disponible) en el rail derecho
      try {
        const firma = await obtenerEstadoFirmaApi();
        setEstadoFirma(firma);
      } catch {
        // el rail se mantiene con el estado previo si falla el refresh
      }
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || 'No se pudieron guardar las credenciales.';
      toast.error(mensaje);
    } finally {
      setIsSavingCreds(false);
    }
  };

  // ── Test firmador ──
  const probarFirmador = async () => {
    setEstadoFirmador('probando');
    try {
      await testFirmadorApi();
      setEstadoFirmador('ok');
    } catch {
      setEstadoFirmador('error');
    }
  };

  // ── Test conexión Hacienda (Fase 4) ──
  // Usa las credenciales guardadas. El backend nunca devuelve el token.
  const probarHacienda = async () => {
    setEstadoHacienda('probando');
    try {
      const resultado = await testHaciendaApi();
      setEstadoHacienda({ ok: true, ambiente: resultado?.ambiente });
    } catch {
      setEstadoHacienda({ ok: false });
    }
  };

  // ── Consultar estado de firma por tenant (Fase 4) ──
  const consultarEstadoFirma = async () => {
    setEstadoFirma('probando');
    try {
      const firma = await obtenerEstadoFirmaApi();
      setEstadoFirma(firma);
    } catch {
      setEstadoFirma({ estado: 'firmador_offline', firmador_disponible: false, credencial_firma_disponible: false });
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
      <Card className="p-8 text-center">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" aria-hidden="true" />
        <p className="text-muted-foreground mb-4" role="alert">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Reintentar
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* Advertencia de producción */}
      {esProduccion && (
        <div className="flex gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">

        {/* ══ COLUMNA IZQUIERDA — Formularios ══ */}
        <div className="space-y-6">

          {/* SECCIÓN 1 — Datos del emisor (guardado independiente) */}
          <form onSubmit={handleSubmitDatos(onSubmitDatos)} noValidate>
            <Card>
              <CardHeader className="border-b bg-gray-50/60">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  Datos del emisor
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nombre">
                    Nombre / Razón social <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    className={errorsDatos.nombre ? 'border-destructive focus-visible:ring-destructive' : ''}
                    {...registerDatos('nombre')}
                  />
                  {errorsDatos.nombre && <p className="text-xs text-destructive" role="alert">{errorsDatos.nombre.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre_comercial">Nombre comercial</Label>
                  <Input id="nombre_comercial" {...registerDatos('nombre_comercial')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nit">
                    NIT <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <MaskedInput
                    mask="nit"
                    id="nit"
                    register={registerDatos('nit')}
                    placeholder="0000-000000-000-0"
                    className={`font-mono ${errorsDatos.nit ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {errorsDatos.nit && <p className="text-xs text-destructive" role="alert">{errorsDatos.nit.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nrc">
                    NRC <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <MaskedInput
                    mask="nrc"
                    id="nrc"
                    register={registerDatos('nrc')}
                    placeholder="000000-0"
                    className={`font-mono ${errorsDatos.nrc ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {errorsDatos.nrc && <p className="text-xs text-destructive" role="alert">{errorsDatos.nrc.message}</p>}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="direccion">
                    Dirección <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="direccion"
                    className={errorsDatos.direccion ? 'border-destructive focus-visible:ring-destructive' : ''}
                    {...registerDatos('direccion')}
                  />
                  {errorsDatos.direccion && <p className="text-xs text-destructive" role="alert">{errorsDatos.direccion.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <MaskedInput
                    mask="telefono"
                    id="telefono"
                    register={registerDatos('telefono')}
                    placeholder="0000-0000"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email interno</Label>
                  <Input
                    id="email"
                    type="email"
                    className={errorsDatos.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                    {...registerDatos('email')}
                  />
                  {errorsDatos.email && <p className="text-xs text-destructive" role="alert">{errorsDatos.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correo">
                    Correo (Hacienda) <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="correo"
                    type="email"
                    placeholder="correo@empresa.com"
                    className={errorsDatos.correo ? 'border-destructive focus-visible:ring-destructive' : ''}
                    {...registerDatos('correo')}
                  />
                  {errorsDatos.correo && <p className="text-xs text-destructive" role="alert">{errorsDatos.correo.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    Este correo aparece en el JSON del DTE enviado a Hacienda
                  </p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="codigo_actividad">
                    Código de actividad <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Controller
                    control={controlDatos}
                    name="codigo_actividad"
                    render={({ field }) => (
                      <Combobox
                        value={field.value}
                        onChange={(v) => {
                          field.onChange(v);
                          const opcion = actividades.find((a) => a.codigo === v);
                          if (opcion) {
                            setValueDatos('desc_actividad', opcion.descripcion, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                          if (v !== codigoLegado) setCodigoLegado(null);
                        }}
                        options={opcionesActividad}
                        placeholder="Buscar y seleccionar código"
                        searchPlaceholder="Buscar por código o descripción..."
                        emptyMessage="Sin resultados."
                      />
                    )}
                  />
                  {errorCatalogo && (
                    <p className="text-xs text-red-500" role="alert">
                      No se pudo cargar el catálogo de actividades de Hacienda.
                    </p>
                  )}
                  {esCodigoLegado && (
                    <p className="text-xs text-amber-600" role="alert">
                      El código guardado no existe en el catálogo vigente de Hacienda.
                      Selecciona uno válido para poder guardar.
                    </p>
                  )}
                  {errorsDatos.codigo_actividad && <p className="text-xs text-destructive" role="alert">{errorsDatos.codigo_actividad.message}</p>}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="desc_actividad">
                    Descripción de actividad económica <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="desc_actividad"
                    readOnly
                    placeholder="Selecciona un código de actividad para autocompletar"
                    className="bg-muted/50"
                    {...registerDatos('desc_actividad')}
                  />
                  {errorsDatos.desc_actividad && <p className="text-xs text-destructive" role="alert">{errorsDatos.desc_actividad.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    Se completa automáticamente según el código seleccionado (catálogo CAT-019 de Hacienda)
                    y aparece como descActividad en el JSON del DTE.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_establecimiento">
                    Tipo de establecimiento <span className="text-red-500" aria-hidden="true">*</span>
                  </Label>
                  <Controller
                    control={controlDatos}
                    name="tipo_establecimiento"
                    render={({ field }) => (
                      <Combobox
                        value={field.value}
                        onChange={(v) => {
                          field.onChange(v);
                          if (v !== tipoLegado) setTipoLegado(null);
                        }}
                        options={opcionesTipoEstablecimiento}
                        placeholder="Seleccionar tipo"
                        searchPlaceholder="Buscar tipo..."
                        emptyMessage="Sin resultados."
                      />
                    )}
                  />
                  {esTipoLegado && (
                    <p className="text-xs text-amber-600" role="alert">
                      El tipo guardado no existe en el catálogo vigente (CAT-009). Selecciona uno válido.
                    </p>
                  )}
                  {errorsDatos.tipo_establecimiento && <p className="text-xs text-destructive" role="alert">{errorsDatos.tipo_establecimiento.message}</p>}
                </div>

              </CardContent>

              {/* Acciones del formulario de datos */}
              <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
                <AvisoCambios visible={isDirtyDatos} />
                <Button type="submit" disabled={isSavingDatos || !isDirtyDatos}>
                  {isSavingDatos ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save aria-hidden="true" />
                      Guardar datos del emisor
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>

          {/* SECCIÓN 2 — Credenciales oficiales Hacienda (guardado independiente) */}
          <form onSubmit={handleSubmitCredenciales(onSubmitCredenciales)} noValidate>
            <Card>
              <CardHeader className="border-b bg-gray-50/60">
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                  Credenciales oficiales Hacienda
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Credenciales de acceso a la API del Ministerio de Hacienda (fuente de verdad fiscal).
                  Se guardan encriptadas y el sistema nunca vuelve a mostrarlas.
                  No se impone formato: <strong>la validez la verifica Hacienda al probar la conexión</strong>.
                  Son independientes de la API Key técnica de integración POS ↔ DTE (ver rail derecho).
                </p>

                <div className="space-y-2">
                  <Label htmlFor="usuario_hacienda">Usuario Hacienda</Label>
                  <Input
                    id="usuario_hacienda"
                    type="email"
                    placeholder="usuario@empresa.com"
                    className={errorsCredenciales.usuario_hacienda ? 'border-destructive focus-visible:ring-destructive' : ''}
                    {...registerCredenciales('usuario_hacienda')}
                  />
                  {errorsCredenciales.usuario_hacienda && <p className="text-xs text-destructive" role="alert">{errorsCredenciales.usuario_hacienda.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password_hacienda">
                    Password Hacienda
                    <span className="ml-1 font-normal text-muted-foreground">(vacío = no cambiar)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password_hacienda"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="pr-10"
                      {...registerCredenciales('password_hacienda')}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword
                        ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                        : <Eye    className="w-4 h-4" aria-hidden="true" />
                      }
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Guarda primero las credenciales y luego prueba la conexión.
                  </p>
                </div>

                {/* Contraseña de firma (passwordPri) — POR TENANT, cifrada en BD.
                    Es la contraseña de la llave privada del certificado de firma
                    (firmador remoto). Cada empresa carga la suya; el sistema la
                    usa al firmar DTEs (emisiones manuales, POS y cron). */}
                <div className="sm:col-span-2 mt-2 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="password_firma">
                      Contraseña de firma (passwordPri)
                      <span className="ml-1 font-normal text-muted-foreground">(vacío = no cambiar)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password_firma"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="pr-10"
                        {...registerCredenciales('password_firma')}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword
                          ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                          : <Eye    className="w-4 h-4" aria-hidden="true" />
                        }
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Contraseña de la llave privada del certificado de firma. Se guarda
                      encriptada (por empresa) y se usa automáticamente al firmar DTEs
                      — incluidas las emisiones automáticas del POS.
                    </p>
                  </div>
                </div>

                {/* Prueba de autenticación Hacienda (Fase 4) */}
                <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border bg-gray-50/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Conexión con Hacienda</p>
                    <p className="text-xs text-muted-foreground">
                      Prueba las credenciales guardadas contra la API del MH (no devuelve el token)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <EstadoHacienda estado={estadoHacienda} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={probarHacienda}
                      disabled={estadoHacienda === 'probando'}
                    >
                      <Wifi aria-hidden="true" />
                      Probar
                    </Button>
                  </div>
                </div>

              </CardContent>

              {/* Acciones del formulario de credenciales */}
              <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
                <AvisoCambios visible={isDirtyCredenciales} />
                <Button type="submit" disabled={isSavingCreds || !isDirtyCredenciales}>
                  {isSavingCreds ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save aria-hidden="true" />
                      Guardar credenciales
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        </div>

        {/* ══ COLUMNA DERECHA — Rail de estado ══ */}
        <aside className="space-y-6">

          {/* Estado de servicios */}
          <Card>
            <CardHeader className="border-b bg-gray-50/60">
              <CardTitle className="text-base">Estado de servicios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">

              {/* Ambiente */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Ambiente</p>
                  <p className="text-xs text-muted-foreground">Configurado en el servidor</p>
                </div>
                <Badge variant={esProduccion ? 'destructive' : 'outline'}>
                  {esProduccion ? 'PRODUCCIÓN' : 'PRUEBAS'}
                </Badge>
              </div>

              {/* Firmador */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Firmador electrónico</p>
                  <p className="text-xs text-muted-foreground">Servicio de firma del MH</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <EstadoConexion estado={estadoFirmador} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={probarFirmador}
                    disabled={estadoFirmador === 'probando'}
                  >
                    <Wifi aria-hidden="true" />
                    Probar
                  </Button>
                </div>
              </div>

              {/* Certificado de firma por tenant (Fase 4) */}
              <div className="flex items-center justify-between gap-2 border-t pt-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Certificado de firma</p>
                  <p className="text-xs text-muted-foreground">Estado para este NIT (firmador + credencial)</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <EstadoFirma estado={estadoFirma} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={consultarEstadoFirma}
                    disabled={estadoFirma === 'probando'}
                  >
                    <RefreshCw aria-hidden="true" />
                    Consultar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integración con POS (API Key técnica) */}
          <Card>
            <CardHeader className="border-b bg-gray-50/60">
              <CardTitle className="text-base">Integración con POS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              <p className="text-xs text-muted-foreground">
                API Key técnica de integración POS ↔ DTE — <strong>distinta</strong> de las credenciales
                Hacienda. Se genera en la provisión de empresas y nunca se vuelve a mostrar
                (se administra en el Onboarding).
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">API Key integración</p>
                {tieneApiKey !== null ? (
                  <Badge variant={tieneApiKey ? 'default' : 'secondary'}>
                    {tieneApiKey ? 'CONFIGURADA' : 'SIN CONFIGURAR'}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

      </div>
    </div>
  );
};

export default Configuracion;