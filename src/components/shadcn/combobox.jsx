// src/components/ui/combobox.jsx
// Combobox con búsqueda (Popover + Command) — integrable con react-hook-form
// vía value/onChange controlados. Busca dentro de value + label.

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/shadcn/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/shadcn/command';

const Combobox = ({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Sin resultados.',
  disabled = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const seleccionado = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !seleccionado && 'text-muted-foreground',
            className
          )}
        >
          {seleccionado ? seleccionado.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opcion) => (
                <CommandItem
                  key={opcion.value}
                  value={`${opcion.value} ${opcion.label}`}
                  onSelect={() => {
                    onChange(opcion.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === opcion.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {opcion.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default Combobox;