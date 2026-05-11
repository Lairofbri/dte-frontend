// src/components/ui/Button.jsx
// Botón reutilizable con variantes, tamaños y estado de carga

import { Loader2 } from 'lucide-react';

const VARIANTES = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  danger:    'btn-danger',
  ghost:     'btn-ghost',
};

const TAMAÑOS = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

const Button = ({
  children,
  variant   = 'primary',
  size      = 'md',
  isLoading = false,
  disabled  = false,
  type      = 'button',
  onClick,
  className = '',
  ariaLabel,
  fullWidth = false,
}) => {
  const claseVariante = VARIANTES[variant] ?? VARIANTES.primary;
  const claseTamaño   = TAMAÑOS[size]    ?? '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      aria-busy={isLoading}
      className={`
        ${claseVariante}
        ${claseTamaño}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim()}
    >
      {isLoading && (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      )}
      {children}
    </button>
  );
};

export default Button;
