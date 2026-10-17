// src/components/clientes/SelectorCliente.jsx
// Select box (combobox) de clientes guardados para el emisor de DTE (paso 2).
//
// Es un select con buscador integrado: al abrirlo muestra TODOS los clientes
// guardados (no hace falta escribir) y, al tipear, filtra server-side (debounce
// + guard de carrera, patrón del proyecto, sin React Query).
//
// Muestra «Nombre — DUI/NIT»: dos clientes pueden compartir nombre, pero nunca
// el documento; el documento evita elegir al homónimo equivocado. Al seleccionar
// construye el receptor completo según el tipo de DTE (receptorDeCliente) para
// que el formulario se llene con TODOS los datos guardados del cliente.

import { useState, useEffect, useRef, useId, useCallback, useMemo } from 'react';
import { Check, ChevronDown, Loader2, Search, UserPlus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { cn } from '@/lib/utils';
import { Input } from '@/components/shadcn/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import { buscarClientesApi, crearClienteApi } from '../../api/clientes.api';
import ModalCliente from './ModalCliente';
import {
  etiquetaCliente, etiquetaDocumento, getTipoCliente, receptorDeCliente,
  preferenciaParaDte, filtroSugeridoDte, tipoClienteSugeridoDte,
} from './tiposCliente';

// Texto del trigger según el tipo de DTE activo
const PLACEHOLDER_POR_DTE = {
  '03': 'Seleccionar empresa…',
  '05': 'Seleccionar empresa…',
  '06': 'Seleccionar empresa…',
  '14': 'Seleccionar sujeto excluido…',
};
const PLACEHOLDER_DEFAULT = 'Seleccionar cliente…';

const LIMITE_CLIENTES = 50;

const SelectorCliente = ({ tipoDte, onSeleccionar }) => {
  const listboxId = useId();
  const searchRef = useRef(null);

  const [busqueda,     setBusqueda]     = useState('');
  const [resultados,   setResultados]   = useState([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [abierto,      setAbierto]      = useState(false);
  const [clienteSelec, setClienteSelec] = useState(null);
  const [modalNuevo,   setModalNuevo]   = useState(false);
  const [activoIdx,    setActivoIdx]    = useState(-1);

  // Carga TODOS los clientes al abrir y filtra server-side al escribir
  // (debounce + guard de carrera).
  useEffect(() => {
    if (!abierto) return;

    let cancelado = false;
    const termino = busqueda.trim();

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = { limite: LIMITE_CLIENTES };
        if (termino) params.q = termino;
        const filtro = filtroSugeridoDte(tipoDte);
        if (filtro) params.tipo_cliente = filtro;
        const datos = await buscarClientesApi(params);
        if (!cancelado) {
          setResultados(datos?.clientes ?? []);
          setActivoIdx(-1);
        }
      } catch {
        if (!cancelado) setResultados([]);
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    }, termino ? 300 : 0);

    return () => { cancelado = true; clearTimeout(timer); };
  }, [abierto, busqueda, tipoDte]);

  const resultadosOrdenados = useMemo(
    () => [...resultados].sort(
      (a, b) => preferenciaParaDte(a, tipoDte) - preferenciaParaDte(b, tipoDte)
    ),
    [resultados, tipoDte]
  );

  const seleccionar = useCallback((cliente) => {
    setClienteSelec(cliente);
    setBusqueda('');
    setAbierto(false);
    setActivoIdx(-1);
    onSeleccionar(receptorDeCliente(cliente, tipoDte), cliente.id);
  }, [tipoDte, onSeleccionar]);

  const limpiar = (e) => {
    e?.stopPropagation();
    setClienteSelec(null);
    setBusqueda('');
    setResultados([]);
    setActivoIdx(-1);
    onSeleccionar(null, null);
  };

  // Navegación con teclado dentro del listado
  const onKeyDown = (e) => {
    if (resultadosOrdenados.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivoIdx((p) => Math.min(p + 1, resultadosOrdenados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivoIdx((p) => Math.max(p - 1, 0));
    } else if (e.key === 'Enter' && activoIdx >= 0) {
      e.preventDefault();
      seleccionar(resultadosOrdenados[activoIdx]);
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

  const metaSeleccion = clienteSelec ? getTipoCliente(clienteSelec.tipo_cliente) : null;
  const IconoSeleccion = metaSeleccion?.icono;

  return (
    <div className="relative">
      <Popover
        open={abierto}
        onOpenChange={(open) => {
          setAbierto(open);
          if (open) setBusqueda(''); // al abrir, mostrar todos
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={abierto}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              clienteSelec ? 'pr-14' : 'pr-3'
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              {clienteSelec ? (
                <>
                  <span className={cn('flex size-5 shrink-0 items-center justify-center rounded bg-gradient-to-br ring-1', metaSeleccion.acento)}>
                    <IconoSeleccion className="size-3" aria-hidden="true" />
                  </span>
                  <span className="truncate font-medium text-foreground">{etiquetaCliente(clienteSelec)}</span>
                </>
              ) : (
                <span className="truncate text-muted-foreground">
                  {PLACEHOLDER_POR_DTE[tipoDte] || PLACEHOLDER_DEFAULT}
                </span>
              )}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
          </button>
        </PopoverTrigger>

        {/* Quitar selección (fuera del trigger para no anidar botones) */}
        {clienteSelec && (
          <button
            type="button"
            onClick={limpiar}
            aria-label="Quitar cliente seleccionado"
            className="absolute right-8 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
          onOpenAutoFocus={(e) => { e.preventDefault(); searchRef.current?.focus(); }}
        >
          {/* Buscador integrado */}
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                ref={searchRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded={abierto}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={activoIdx >= 0 ? `${listboxId}-${activoIdx}` : undefined}
                placeholder="Buscar por nombre, DUI o NIT…"
                className="h-9 pl-9 pr-9"
                autoComplete="off"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
              )}
            </div>
          </div>

          {/* Listado de clientes guardados */}
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Clientes guardados"
            className="max-h-72 overflow-y-auto py-1"
          >
            {isLoading && resultadosOrdenados.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Cargando clientes…
              </li>
            ) : resultadosOrdenados.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                {busqueda.trim()
                  ? 'Sin resultados — ¿querés crear este cliente?'
                  : 'Todavía no hay clientes guardados.'}
              </li>
            ) : (
              resultadosOrdenados.map((cliente, idx) => (
                <FilaResultado
                  key={cliente.id}
                  id={`${listboxId}-${idx}`}
                  cliente={cliente}
                  activo={activoIdx === idx}
                  seleccionado={clienteSelec?.id === cliente.id}
                  onSeleccionar={() => seleccionar(cliente)}
                  onActivar={() => setActivoIdx(idx)}
                />
              ))
            )}
          </ul>

          {/* Alta rápida */}
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => { setAbierto(false); setModalNuevo(true); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-accent"
            >
              <UserPlus className="size-4 shrink-0" aria-hidden="true" />
              <span>
                Crear nuevo cliente
                {busqueda.trim() && <span className="text-muted-foreground"> «{busqueda.trim()}»</span>}
              </span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

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
const FilaResultado = ({ id, cliente, activo, seleccionado, onSeleccionar, onActivar }) => {
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

      {seleccionado && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    </li>
  );
};

export default SelectorCliente;
