// src/components/ui/Badge.jsx
// Badge de estado para DTEs y otros elementos
// Usa formatters.infoEstado() para mapear clase y label

import { infoEstado } from '../../utils/formatters';

const Badge = ({ estado, className = '' }) => {
  const { label, clase } = infoEstado(estado);

  return (
    <span className={`${clase} ${className}`}>
      {label}
    </span>
  );
};

// Badge genérico para otros usos fuera de estados de DTE
export const BadgeGenerico = ({
  children,
  variant = 'gray',
  className = '',
}) => {
  const variantes = {
    green:  'badge bg-green-100 text-green-700',
    red:    'badge bg-red-100 text-red-700',
    yellow: 'badge bg-yellow-100 text-yellow-700',
    blue:   'badge bg-blue-100 text-blue-700',
    gray:   'badge bg-gray-100 text-gray-600',
    purple: 'badge bg-purple-100 text-purple-700',
  };

  const clase = variantes[variant] ?? variantes.gray;

  return (
    <span className={`${clase} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
