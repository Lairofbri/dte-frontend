// src/components/productos/SelectorProducto.jsx
// Selector de productos con búsqueda server-side (listarProductosApi + debounce 350ms).
// Reutiliza shadcn Popover + Command (patrón de components/shadcn/combobox.jsx).
// La carga es lazy: solo consulta la BD al abrir el popover.

import { useEffect, useRef, useState } from 'react';
import { Package } from 'lucide-react';

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
  onSeleccionar,
  disabled = false,
  label = 'Agregar producto',
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

  const seleccionar = (producto) => {
    setAbierto(false);
    setBusqueda('');
    onSeleccionar?.(producto);
  };

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(className)}
        >
          <Package className="size-4" data-icon="inline-start" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar producto o código..."
            value={busqueda}
            onValueChange={setBusqueda}
          />
          <CommandList>
            <CommandEmpty>
              {cargando ? 'Buscando...' : 'Sin productos — créalo en la página Productos'}
            </CommandEmpty>
            <CommandGroup>
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SelectorProducto;