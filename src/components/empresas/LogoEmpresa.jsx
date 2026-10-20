// src/components/empresas/LogoEmpresa.jsx
// Carga y borrado del logo por tenant (spec PDF fiscal §2.1 / Fase 3).
//
// El binario NUNCA se lee desde el backend: solo se conoce `tiene_logo`
// (GET /api/provisioning/status). Por eso, después de recargar la página el
// estado es "Logo cargado" sin imagen; el preview existe únicamente en la
// sesión en que se elige el archivo (el blob lo crea el navegador).
//
// Props:
//   tenantId         — tenant dueño del logo (obligatorio)
//   tieneLogoInicial — true/false desde el status; undefined = cargando;
//                      null = no se pudo leer el estado
//   onCambio         — callback con la respuesta del backend
//   disabled         — bloquea las acciones

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircle2, ImageOff, Trash2, Upload } from 'lucide-react';
import {
  actualizarLogoTenantApi,
  eliminarLogoTenantApi,
} from '../../api/provisioning.api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const LIMITE_BYTES = 1024 * 1024;

const mensajeDe = (err, porDefecto) =>
  err?.response?.data?.mensaje || porDefecto;

const LogoEmpresa = ({ tenantId, tieneLogoInicial, onCambio, disabled = false }) => {
  // Último resultado confirmado por el backend: manda sobre el prop para que
  // el estado no "vuelva atrás" mientras el padre refresca sus datos.
  const [override, setOverride]             = useState(null);
  const [archivo, setArchivo]               = useState(null);
  const [previewUrl, setPreviewUrl]         = useState(null);
  const [subiendo, setSubiendo]             = useState(false);
  const [eliminando, setEliminando]         = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [error, setError]                   = useState(null);
  const inputRef   = useRef(null);
  const previewRef = useRef(null);

  const cargandoEstado    = tieneLogoInicial === undefined && override === null;
  const estadoDesconocido = tieneLogoInicial === null && override === null;
  const tieneLogo         = override ?? Boolean(tieneLogoInicial);

  const revocarPreview = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  };

  // Libera el blob al desmontar (el modal de Onboarding se abre y cierra).
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const alSeleccionar = (evento) => {
    const seleccionado = evento.target.files?.[0];
    evento.target.value = ''; // permite volver a elegir el mismo archivo
    if (!seleccionado) return;

    if (seleccionado.type !== 'image/png') {
      setError('El logo debe ser un archivo PNG (no JPG, WebP ni SVG).');
      return;
    }
    if (seleccionado.size > LIMITE_BYTES) {
      setError('El logo supera el máximo de 1 MB.');
      return;
    }

    setError(null);
    setArchivo(seleccionado);
    revocarPreview();
    const url = URL.createObjectURL(seleccionado);
    previewRef.current = url;
    setPreviewUrl(url);
  };

  const guardar = async () => {
    if (!archivo || !tenantId) return;
    setSubiendo(true);
    setError(null);
    try {
      const resultado = await actualizarLogoTenantApi(tenantId, archivo);
      setOverride(true);
      setArchivo(null); // el preview de la sesión se conserva
      toast.success('Logo guardado. Se aplicará al PDF fiscal.');
      onCambio?.(resultado);
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo guardar el logo. Reintentá.'));
    } finally {
      setSubiendo(false);
    }
  };

  const cancelarSeleccion = () => {
    setArchivo(null);
    revocarPreview();
    setError(null);
  };

  const quitar = async () => {
    if (!tenantId) return;
    setEliminando(true);
    setError(null);
    try {
      const resultado = await eliminarLogoTenantApi(tenantId);
      setOverride(false);
      setArchivo(null);
      revocarPreview();
      setConfirmarBorrado(false);
      toast.success('Logo eliminado. El PDF se generará sin logo.');
      onCambio?.(resultado);
    } catch (err) {
      setConfirmarBorrado(false);
      setError(mensajeDe(err, 'No se pudo quitar el logo. Reintentá.'));
    } finally {
      setEliminando(false);
    }
  };

  if (cargandoEstado) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-24 w-full max-w-[240px] animate-pulse rounded-lg bg-gray-100" />
        <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
        <span className="sr-only">Cargando estado del logo…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-24 w-full max-w-[240px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-200 bg-gray-50">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Vista previa del logo de la empresa"
              className="max-h-20 max-w-full object-contain"
            />
          ) : tieneLogo ? (
            <div className="px-2 text-center">
              <CheckCircle2 className="mx-auto h-5 w-5 text-green-600" aria-hidden="true" />
              <p className="mt-1 text-xs font-medium text-gray-700">Logo cargado</p>
            </div>
          ) : (
            <div className="px-2 text-center">
              <ImageOff className="mx-auto h-5 w-5 text-gray-400" aria-hidden="true" />
              <p className="mt-1 text-xs text-gray-500">Sin logo</p>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground">
            Aparece en el encabezado del PDF fiscal. Sin logo, el PDF se genera
            sin imagen: nunca se usa un placeholder.
          </p>
          <div className="flex flex-wrap gap-2">
            {archivo ? (
              <>
                <Button
                  size="sm"
                  onClick={guardar}
                  isLoading={subiendo}
                  disabled={disabled || eliminando}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Guardar logo
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={cancelarSeleccion}
                  disabled={subiendo}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled || subiendo || eliminando}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {tieneLogo ? 'Reemplazar logo' : 'Cargar logo (PNG)'}
                </Button>
                {tieneLogo && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setConfirmarBorrado(true)}
                    disabled={disabled || subiendo || eliminando}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Quitar logo
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png"
        className="hidden"
        tabIndex={-1}
        aria-label="Archivo del logo (PNG)"
        onChange={alSeleccionar}
      />

      {estadoDesconocido && (
        <p className="text-xs text-amber-600" role="status">
          No se pudo leer el estado del logo. Podés cargar uno nuevo igual.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        PNG de hasta 1 MB. Se ajusta automáticamente a 600×200 px como máximo.
      </p>

      <Modal
        isOpen={confirmarBorrado}
        onClose={() => { if (!eliminando) setConfirmarBorrado(false); }}
        title="Quitar logo de la empresa"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            El PDF fiscal se generará <strong>sin logo</strong> a partir de ahora.
            No se usa ningún placeholder. Podés volver a cargarlo cuando quieras.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmarBorrado(false)}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={quitar} isLoading={eliminando}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Quitar logo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LogoEmpresa;
