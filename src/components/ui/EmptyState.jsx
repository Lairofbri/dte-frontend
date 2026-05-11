// src/components/ui/EmptyState.jsx
// Estado vacío para listas y secciones sin datos

import { FileX } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  title       = 'Sin resultados',
  description = 'No hay datos para mostrar.',
  icon: Icon  = FileX,
  action,     // { label: string, onClick: fn }
  className   = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-gray-400" aria-hidden="true" />
    </div>
    <h3 className="text-sm font-medium text-gray-700 mb-1">{title}</h3>
    <p className="text-sm text-gray-400 max-w-xs">{description}</p>
    {action && (
      <div className="mt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      </div>
    )}
  </div>
);

export default EmptyState;
