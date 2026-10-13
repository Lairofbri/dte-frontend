// src/components/dtes/emitir/Paso1Tipo.jsx
// Paso 1 del wizard — selección del tipo de documento (FCF, CCF, NC, ND, FSE).
// Tarjetas seleccionables con ícono, descripción y chips de requisitos.

import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group';
import { Badge } from '@/components/shadcn/badge';
import { TIPOS_DTE } from './catalogos';

const Paso1Tipo = ({ tipoDte, onChange }) => (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-semibold text-foreground">¿Qué documento necesitás emitir?</h2>
      <p className="text-sm text-muted-foreground">
        Seleccioná el tipo según la operación que querés facturar. Podés cambiarlo en cualquier momento.
      </p>
    </div>

    <ToggleGroup
      type="single"
      value={tipoDte}
      onValueChange={(v) => { if (v) onChange(v); }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {TIPOS_DTE.map((t) => {
        const Icono = t.icono;
        const activo = tipoDte === t.valor;
        return (
          <ToggleGroupItem
            key={t.valor}
            value={t.valor}
            className={cn(
              'h-auto w-full flex-col items-start gap-3 rounded-xl border p-4 text-left',
              'data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:shadow-sm',
              'hover:border-primary/50',
              activo && 'border-primary'
            )}
          >
            <span className="flex w-full items-center justify-between">
              <span
                className={cn(
                  'flex size-10 items-center justify-center rounded-lg transition-colors',
                  activo ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                <Icono className="size-5" aria-hidden="true" />
              </span>
              <Badge variant="outline" className={cn('font-mono text-xs', activo && 'border-primary text-primary')}>
                {t.sigla}
              </Badge>
            </span>
            <span className="w-full">
              <span className={cn('block font-semibold', activo ? 'text-primary' : 'text-foreground')}>
                {t.titulo}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {t.descripcion}
              </span>
            </span>
            <span className="flex w-full flex-wrap gap-1.5">
              {t.chips.map((chip) => (
                <Badge key={chip} variant="secondary" className="text-[10px] font-normal">
                  {chip}
                </Badge>
              ))}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  </div>
);

export default Paso1Tipo;