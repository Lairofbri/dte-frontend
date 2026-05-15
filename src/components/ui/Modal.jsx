// src/components/ui/Modal.jsx
// Modal accesible con variantes de tamaño incluyendo fullscreen
//
// CAMBIOS:
// → overlay click NO cierra — evita pérdida de datos accidental
// → Escape NO cierra automáticamente — solo el botón X
// → size="fullscreen" ocupa toda la pantalla menos el sidebar
// → Scroll interno en el contenido cuando el formulario es largo
// → Botón X siempre visible en el header
// → aria-modal, role="dialog", aria-labelledby para accesibilidad

import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

const TAMAÑOS = {
  sm:         'max-w-md',
  md:         'max-w-lg',
  lg:         'max-w-2xl',
  xl:         'max-w-4xl',
  fullscreen: 'w-full h-full', // manejado aparte
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size      = 'md',
  className = '',
}) => {
  const uid      = useId();
  const titleId  = `modal-title-${uid}`;
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Solo bloquear scroll — Escape NO cierra (evita pérdida de datos)
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();

    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const esFullscreen = size === 'fullscreen';

  return (
    // Overlay — NO tiene onClick para evitar cierre accidental
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      aria-hidden="false"
    >
      {/* Fondo oscuro — sin onClick intencional */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Contenedor del modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`
          relative bg-white shadow-xl outline-none flex flex-col
          ${esFullscreen
            // Fullscreen: ocupa toda la altura y casi todo el ancho
            // El sidebar tiene ~240px colapsado ~64px — usamos margen izquierdo
            // En móvil ocupa todo
            ? 'w-full h-screen sm:ml-0 md:rounded-none overflow-hidden'
            : `w-full ${TAMAÑOS[size] ?? TAMAÑOS.md} my-8 rounded-xl max-h-[calc(100vh-4rem)]`
          }
          ${className}
        `}
      >
        {/* Header — siempre fijo arriba con botón X */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2
            id={titleId}
            className="text-lg font-semibold font-sans text-gray-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar y descartar cambios"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido — con scroll interno */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
