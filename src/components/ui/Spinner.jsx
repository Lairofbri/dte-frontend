// src/components/ui/Spinner.jsx
// Indicador de carga accesible

const TAMAÑOS = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const Spinner = ({ size = 'md', className = '' }) => {
  const claseTamaño = TAMAÑOS[size] ?? TAMAÑOS.md;

  return (
    <div
      role="status"
      aria-label="Cargando..."
      className={`inline-flex items-center justify-center ${className}`}
    >
      <div
        className={`
          ${claseTamaño}
          border-2 border-primary-200 border-t-primary-600
          rounded-full animate-spin
        `}
        aria-hidden="true"
      />
      <span className="sr-only">Cargando...</span>
    </div>
  );
};

// Spinner de página completa — para estados de carga globales
export const SpinnerPagina = ({ mensaje = 'Cargando...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
    <Spinner size="lg" />
    <p className="text-sm text-gray-500">{mensaje}</p>
  </div>
);

export default Spinner;
