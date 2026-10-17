// src/components/clientes/TipoClienteSelector.jsx
// Selector de tipo de cliente (natural / jurídica / sujeto excluido).
// Reutilizable: recibe `valor`/`onChange` y se usa tanto en el modal de
// creación como en el alta rápida desde el emisor de DTE.

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { TIPOS_CLIENTE } from './tiposCliente';

const TipoClienteSelector = ({
  valor,
  onChange,
  tipos = TIPOS_CLIENTE,
  className,
}) => (
  <div
    role="radiogroup"
    aria-label="Tipo de cliente"
    className={cn('grid gap-2', className)}
  >
    {tipos.map((tipo) => {
      const activo = valor === tipo.valor;
      const Icono = tipo.icono;

      return (
        <button
          key={tipo.valor}
          type="button"
          role="radio"
          aria-checked={activo}
          onClick={() => onChange(tipo.valor)}
          className={cn(
            'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border p-3 text-left transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            activo
              ? cn('border-transparent bg-gradient-to-br shadow-sm ring-2', tipo.acento)
              : 'border-border bg-background hover:border-primary/40 hover:bg-accent/40'
          )}
        >
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/70 ring-1 transition-colors',
              activo ? 'ring-current/25' : 'text-muted-foreground ring-border'
            )}
          >
            <Icono className="size-4" aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {tipo.etiqueta}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {tipo.descripcion}
            </span>
          </span>

          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-full border transition-all',
              activo
                ? 'border-current bg-background/70 text-current'
                : 'border-border text-transparent'
            )}
          >
            <Check className="size-3" aria-hidden="true" />
          </span>
        </button>
      );
    })}
  </div>
);

export default TipoClienteSelector;
