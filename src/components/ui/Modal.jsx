// src/components/ui/Modal.jsx
// Modal accesible con:
// → Cierre con tecla Escape
// → Bloqueo de scroll del body
// → aria-modal, role="dialog", aria-labelledby
// → Cierre al hacer click en el overlay

import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

const TAMAÑOS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size      = 'md',
  className = '',
}) => {
  // useId genera un ID único por instancia — evita IDs duplicados
  // cuando hay múltiples modales en el DOM simultáneamente
  const uid      = useId();
  const titleId  = `modal-title-${uid}`;
  const modalRef = useRef(null);

  // Cerrar con Escape y bloquear scroll del body
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    // Guardar el overflow previo para restaurarlo al cerrar
    // No siempre es '' — puede ser 'auto', 'scroll', etc.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeyDown);
    modalRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restaurar el valor original — no asumir que era ''
      document.body.style.overflow = overflowPrevio;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const claseTamaño = TAMAÑOS[size] ?? TAMAÑOS.md;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden="false"
    >
      {/* Fondo oscuro */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenido del modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`
          relative w-full ${claseTamaño} bg-white rounded-xl shadow-xl
          outline-none ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2
            id={titleId}
            className="text-lg font-semibold font-sans text-gray-900"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
