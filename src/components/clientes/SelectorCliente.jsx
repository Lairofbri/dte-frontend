// src/components/clientes/SelectorCliente.jsx
// Combobox async de clientes para el emisor de DTE.
//
// - Debounce 350 ms + guard de carrera (patrón del proyecto, sin React Query).
// - Muestra «Nombre — DUI/NIT»: dos clientes pueden compartir nombre, pero
//   nunca el documento; el documento evita elegir al homónimo equivocado.
// - Al seleccionar, construye el receptor completo según el tipo de DTE
//   (receptorDeCliente) para que el formulario se llene con TODOS los datos
//   guardados del cliente.

import { useState, useEffect, useRef, useId, useCallback, useMemo } from 'react';
import { Search, X, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { cn } from '@/lib/utils';
import { Input } from '@/components/shadcn/input';
import { Button } from '@/components/shadcn/button';
import { buscarClientesApi, crearClienteApi } from '../../api/clientes.api';
import ModalCliente from './ModalCliente';
import {
  etiquetaCliente, etiquetaDocumento, getTipoCliente, receptorDeCliente,
  preferenciaParaDte, filtroSugeridoDte, tipoClienteSugeridoDte,
} from './tiposCliente';

const PLACEHOLDER_POR_DTE = {
  '03': 'Buscar empresa (nombre, NIT, NRC)…',
  '05': 'Buscar empresa (nombre, NIT, NRC)…',
  '06': 'Buscar empresa (nombre, NIT, NRC)…',
  '14': 'Buscar sujeto excluido (nombre, DUI, NIT)…',
};
const PLACEHOLDER_DEFAULT = 'Buscar cliente (nombre, DUI, NIT)…';

const SelectorCliente = ({ tipoDte, onSeleccionar, valorActual = '' }) => {
  const inputId   = useId();
  const listboxId = useId();

  const [busqueda,     setBusqueda]     = useState(valorActual);
  const [resultados,   setResultados]   = useState([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [abierto,      setAbierto]      = useState(false);
  const [clienteSelec, setClienteSelec] = useState(null);
  const [modalNuevo,   setModalNuevo]   = useState(false);
  const [activoIdx,    setActivoIdx]    = useState(-1);
  const wrapperRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const resultadosOrdenados = useMemo(
    () => [...resultados].sort(
      (a, b) => preferenciaParaDte(a, tipoDte) - preferenciaParaDte(b, tipoDte)
    ),
    [resultados, tipoDte]
  );
  const resultadosVisibles = busqueda.trim() ? resultadosOrdenados : [];
  const abiertoVisible     = abierto && !clienteSelec && busqueda.trim().length > 0;

  // Búsqueda con debounce + guard de carrera
  useEffect(() => {
    if (clienteSelec) return; // Ya seleccionado — no buscar
    if (!busqueda.trim()) return;

    let cancelado = false;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = { q: busqueda.trim(), limite: 8 };
        const filtro = filtroSugeridoDte(tipoDte);
        if (filtro) params.tipo_cliente = filtro;
        const datos = await buscarClientesApi(params);
        if (!cancelado) {
          setResultados(datos?.clientes ?? []);
          setAbierto(true);
          setActivoIdx(-1);
        }
      } catch {
        if (!cancelado) setResultados([]);
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    }, 350);

    return () => { cancelado = true; clearTimeout(timer); };
  }, [busqueda, tipoDte, clienteSelec]);

  const seleccionar = useCallback((cliente) => {
    setClienteSelec(cliente);
    setBusqueda('');
    setResultados([]);
    setAbierto(false);
    setActivoIdx(-1);
    onSeleccionar(receptorDeCliente(cliente, tipoDte), cliente.id);
  }, [tipoDte, onSeleccionar]);

  const limpiar = () => {
    setClienteSelec(null);
    setBusqueda('');
    setResultados([]);
    setAbierto(false);
    setActivoIdx(-1);
    onSeleccionar(null, null);
  };

  // Navegación con teclado
  const onKeyDown = (e) => {
    if (!abiertoVisible || resultadosVisibles.length === 0) {
      if (e.key === 'Escape') setAbierto(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivoIdx((p) => Math.min(p + 1, resultadosVisibles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivoIdx((p) => Math.max(p - 1, 0));
    } else if (e.key === 'Enter' && activoIdx >= 0) {
      e.preventDefault();
      seleccionar(resultadosVisibles[activoIdx]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  // Crear cliente desde el selector (semilla con lo escrito + tipo sugerido)
  const onCrearCliente = async (datos) => {
    const nuevo = await crearClienteApi(datos);
    toast.success('Cliente creado y seleccionado.');
    seleccionar(nuevo);
    setModalNuevo(false);
  };

  const semilla = useMemo(
    () => ({ nombre: busqueda.trim(), tipo_cliente: tipoClienteSugeridoDte(tipoDte) }),
    [busqueda, tipoDte]
  );

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      {/* Input de búsqueda */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={abiertoVisible}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activoIdx >= 0 ? `${listboxId}-${activoIdx}` : undefined}
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            if (clienteSelec) setClienteSelec(null);
          }}
          onFocus={() => { if (!clienteSelec && resultadosVisibles.length > 0) setAbierto(true); }}
          onKeyDown={onKeyDown}
          placeholder={PLACEHOLDER_POR_DTE[tipoDte] || PLACEHOLDER_DEFAULT}
          className="h-10 pl-9 pr-16"
          autoComplete="off"
        />

        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {isLoading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />}
          {clienteSelec && (
            <button
              type="button"
              onClick={limpiar}
              aria-label="Quitar cliente seleccionado"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Chip del cliente seleccionado */}
      {clienteSelec && <ChipSeleccionado cliente={clienteSelec} onLimpiar={limpiar} />}

      {/* Dropdown */}
      {abiertoVisible && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Resultados de búsqueda de clientes"
          className="absolute z-50 mt-1 w-full origin-top overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl duration-150 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
        >
          {resultadosVisibles.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin resultados — ¿querés crear este cliente?
            </li>
          ) : (
            <li className="max-h-80 overflow-y-auto py-1">
              <ul>
                {resultadosVisibles.map((cliente, idx) => (
                  <FilaResultado
                    key={cliente.id}
                    id={`${listboxId}-${idx}`}
                    cliente={cliente}
                    activo={activoIdx === idx}
                    onSeleccionar={() => seleccionar(cliente)}
                    onActivar={() => setActivoIdx(idx)}
                  />
                ))}
              </ul>
            </li>
          )}

          {/* Alta rápida */}
          <li className="border-t border-border">
            <button
              type="button"
              onClick={() => { setAbierto(false); setModalNuevo(true); }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-accent"
            >
              <UserPlus className="size-4 shrink-0" aria-hidden="true" />
              <span>
                Crear nuevo cliente
                {busqueda.trim() && <span className="text-muted-foreground"> «{busqueda.trim()}»</span>}
              </span>
            </button>
          </li>
        </ul>
      )}

      {/* Modal de alta (crear) */}
      <ModalCliente
        isOpen={modalNuevo}
        onClose={() => setModalNuevo(false)}
        onGuardar={onCrearCliente}
        semilla={semilla}
      />
    </div>
  );
};

// ── Fila de resultado ──
const FilaResultado = ({ id, cliente, activo, onSeleccionar, onActivar }) => {
  const meta = getTipoCliente(cliente.tipo_cliente);
  const Icono = meta.icono;
  const documento = etiquetaDocumento(cliente);

  return (
    <li
      id={id}
      role="option"
      aria-selected={activo}
      onClick={onSeleccionar}
      onMouseEnter={onActivar}
      className={cn(
        'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors',
        activo ? 'bg-accent' : 'hover:bg-accent/60'
      )}
    >
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ring-1', meta.acento)}>
        <Icono className="size-4" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {cliente.nombre}
        </span>
        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {documento && <span className="font-mono">{documento}</span>}
          {documento && cliente.correo && <span aria-hidden="true">·</span>}
          {cliente.correo && <span className="truncate">{cliente.correo}</span>}
          {!documento && !cliente.correo && <span className="italic">Sin más datos</span>}
        </span>
      </span>

      {cliente.total_dtes > 0 && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {cliente.total_dtes} DTE{cliente.total_dtes !== 1 ? 's' : ''}
        </span>
      )}
    </li>
  );
};

// ── Chip del cliente seleccionado ──
const ChipSeleccionado = ({ cliente, onLimpiar }) => {
  const meta = getTipoCliente(cliente.tipo_cliente);
  const Icono = meta.icono;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ring-1', meta.acento)}>
        <Icono className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {etiquetaCliente(cliente)}
        </p>
        <p className="truncate text-xs text-muted-foreground">{meta.etiqueta}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onLimpiar}
        aria-label="Quitar cliente seleccionado"
        className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
};

export default SelectorCliente;
