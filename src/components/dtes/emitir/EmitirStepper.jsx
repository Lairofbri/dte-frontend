// src/components/dtes/emitir/EmitirStepper.jsx
// Indicador de progreso del wizard de emisión.
// Estados: completado (check + clickeable), actual (anillo primario), pendiente.
// En pantallas pequeñas se muestra como fila de puntos compacta.

import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shadcn/button';
import { Separator } from '@/components/shadcn/separator';
import { TIPOS_DTE } from './catalogos';

const EmitirStepper = ({ pasoActual, maxPasoAlcanzado, onIrAPaso, tipoDte }) => {
  const pasos = [
    { id: 1, label: 'Tipo' },
    { id: 2, label: 'Receptor' },
    { id: 3, label: 'Ítems' },
    { id: 4, label: 'Pago' },
    { id: 5, label: 'Emitir' },
  ];

  const tipo = TIPOS_DTE.find((t) => t.valor === tipoDte);

  return (
    <div className="rounded-xl border bg-white p-4 shadow-card">
      <div className="flex items-center">
        {pasos.map((paso, idx) => {
          const completado = paso.id < pasoActual;
          const actual     = paso.id === pasoActual;
          const pendiente  = paso.id > pasoActual;
          const clickeable = paso.id <= maxPasoAlcanzado && paso.id !== pasoActual;

          return (
            <div key={paso.id} className={cn('flex items-center', idx > 0 && 'flex-1')}>
              {/* Línea conectora */}
              {idx > 0 && (
                <Separator
                  className={cn(
                    'mx-2 h-px flex-1 transition-colors',
                    paso.id <= maxPasoAlcanzado ? 'bg-primary/40' : 'bg-muted'
                  )}
                />
              )}

              {/* Paso */}
              <Button
                type="button"
                variant={actual ? 'default' : 'ghost'}
                size="sm"
                disabled={pendiente}
                onClick={() => clickeable && onIrAPaso(paso.id)}
                aria-current={actual ? 'step' : undefined}
                className={cn(
                  'h-auto shrink-0 gap-2 rounded-full px-2.5 py-1.5',
                  completado && 'text-primary',
                  pendiente && 'text-muted-foreground',
                  clickeable && 'hover:bg-primary/10'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                    actual && 'bg-primary text-primary-foreground',
                    completado && 'bg-primary/15 text-primary',
                    pendiente && 'bg-muted text-muted-foreground'
                  )}
                  aria-hidden="true"
                >
                  {completado ? <Check className="size-3.5" /> : pendiente ? <Lock className="size-3" /> : paso.id}
                </span>
                <span className={cn('hidden sm:inline text-xs font-medium', actual && 'font-semibold')}>
                  {paso.label}
                </span>
              </Button>
            </div>
          );
        })}
      </div>

      {/* Línea inferior: tipo seleccionado */}
      {tipo && (
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <tipo.icono className="size-4 text-primary" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">
            Documento: <span className="font-semibold text-foreground">{tipo.sigla} — {tipo.titulo}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default EmitirStepper;