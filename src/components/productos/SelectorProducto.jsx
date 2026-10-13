// src/components/productos/SelectorProducto.jsx
// Combobox "tipo input" que lista los productos del catálogo (búsqueda server-side,
// debounce 350 ms). Vive en el campo Descripción de cada ítem del wizard:
// - al elegir un producto, onSeleccionar(producto) devuelve el producto completo
//   para precargar código, tipo, unidad, precio y tratamiento fiscal;
// - si el texto tipeado no está en el catálogo, onManual(texto) guarda la
//   descripción libre (producto no registrado).
// Carga lazy: solo consulta la BD al abrir el popover.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Package } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/shadcn/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/shadcn/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/shadcn/command';
import { listarProductosApi } from '../../api/productos.api';

const SelectorProducto = ({
  id,
  value = '',
  onSeleccionar,
  onManual,
  placeholder = 'Seleccionar producto del catálogo…',
  disabled = false,
  error = false,
  className,
}) => {
  const [abierto,   setAbierto]   = useState(false);
  const [busqueda,  setBusqueda]  = useState('');
  const [productos, setProductos] = useState([]);
  const [cargando,  setCargando]  = useState(false);
  // Contador de carrera: descarta respuestas obsoletas de búsquedas previas
  const contadorRef = useRef(0);

  useEffect(() => {
    if (!abierto) return;
    const contador = ++contadorRef.current;
    // Debounce de búsqueda; al abrir sin texto carga la primera página
    const timer = setTimeout(async () => {
      setCargando(true);
      try {
        const params = { limite: 20 };
        if (busqueda.trim()) params.q = busqueda.trim();
        const datos = await listarProductosApi(params);
        if (contador === contadorRef.current) setProductos(datos?.productos ?? []);
      } catch {
        if (contador === contadorRef.current) setProductos([]);
      } finally {
        if (contador === contadorRef.current) setCargando(false);
      }
    }, busqueda ? 350 : 0);

    return () => clearTimeout(timer);
  }, [abierto, busqueda]);

  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
  };

  const seleccionar = (producto) => {
    cerrar();
    onSeleccionar?.(producto);
  };

  const aplicarManual = () => {
    if (!busqueda.trim()) return;
    const texto = busqueda.trim();
    cerrar();
    onManual?.(texto);
  };

  const limpiar = () => {
    cerrar();
    onManual?.('');
  };

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between border-input bg-background px-3 text-left font-normal',
            error && 'border-destructive',
            className,
          )}
        >
          <span className="truncate text-sm">
            {value ? (
              <span className="text-foreground">{value}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar producto o código..."
            value={busqueda}
            onValueChange={setBusqueda}
          />
          <CommandList>
            {busqueda.trim() && (
              <CommandGroup heading="Sin resultados en el catálogo">
                <CommandItem
                  value="__manual__"
                  onSelect={aplicarManual}
                >
                  <Package className="size-4 text-muted-foreground" aria-hidden="true" />
                  Usar «{busqueda.trim()}» como descripción
                </CommandItem>
              </CommandGroup>
            )}

            <CommandEmpty>{cargando ? 'Buscando...' : 'Sin productos en el catálogo'}</CommandEmpty>

            <CommandGroup heading="Catálogo">
              {productos.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => seleccionar(p)}
                >
                  <span className="truncate font-medium">{p.nombre}</span>
                  {p.codigo && (
                    <span className="ml-auto shrink-0 text-xs font-mono text-muted-foreground">
                      {p.codigo}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {value && (
              <CommandGroup>
                <CommandItem value="__limpiar__" onSelect={limpiar}>
                  <span className="text-destructive">Limpiar descripción</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SelectorProducto;