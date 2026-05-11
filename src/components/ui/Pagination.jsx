// src/components/ui/Pagination.jsx
// Paginación reutilizable
// → Number() + isInteger() — nunca parseInt (lección de CUBIC)
// → aria-label en cada botón
// → Deshabilitar Anterior/Siguiente en los extremos

import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  total,        // total de registros
  pagina,       // página actual (1-based)
  limite,       // registros por página
  onCambiar,    // fn(nuevaPagina)
  className = '',
}) => {
  // Usar Number() + isInteger() — lección aprendida de CUBIC
  const paginaActual = Number.isInteger(Number(pagina)) ? Number(pagina) : 1;
  const limiteNum    = Number.isInteger(Number(limite))  ? Number(limite)  : 20;
  const totalNum     = Number.isInteger(Number(total))   ? Number(total)   : 0;

  const totalPaginas = Math.ceil(totalNum / limiteNum);

  if (totalPaginas <= 1) return null;

  const esPrimera = paginaActual === 1;
  const esUltima  = paginaActual === totalPaginas;

  // Calcular rango de páginas a mostrar (máximo 5)
  const calcularPaginas = () => {
    const paginas = [];
    let inicio = Math.max(1, paginaActual - 2);
    let fin    = Math.min(totalPaginas, paginaActual + 2);

    // Ajustar para siempre mostrar 5 páginas si es posible
    if (fin - inicio < 4) {
      if (inicio === 1) fin    = Math.min(totalPaginas, inicio + 4);
      else              inicio = Math.max(1, fin - 4);
    }

    for (let i = inicio; i <= fin; i++) paginas.push(i);
    return paginas;
  };

  const paginas = calcularPaginas();

  // Inicio y fin del rango de registros visibles
  const desde = ((paginaActual - 1) * limiteNum) + 1;
  const hasta  = Math.min(paginaActual * limiteNum, totalNum);

  return (
    <div className={`flex items-center justify-between py-3 ${className}`}>
      {/* Información del rango */}
      <p className="text-sm text-gray-500">
        Mostrando{' '}
        <span className="font-medium text-gray-700">{desde}</span>
        {' '}–{' '}
        <span className="font-medium text-gray-700">{hasta}</span>
        {' '}de{' '}
        <span className="font-medium text-gray-700">{totalNum}</span>
        {' '}registros
      </p>

      {/* Controles de paginación */}
      <nav aria-label="Paginación" className="flex items-center gap-1">
        {/* Anterior */}
        <button
          onClick={() => onCambiar(paginaActual - 1)}
          disabled={esPrimera}
          aria-label="Página anterior"
          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Páginas numeradas */}
        {paginas.map((p) => (
          <button
            key={p}
            onClick={() => onCambiar(p)}
            aria-label={`Página ${p}`}
            aria-current={p === paginaActual ? 'page' : undefined}
            className={`
              w-8 h-8 rounded text-sm font-medium transition-colors
              ${p === paginaActual
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            {p}
          </button>
        ))}

        {/* Siguiente */}
        <button
          onClick={() => onCambiar(paginaActual + 1)}
          disabled={esUltima}
          aria-label="Página siguiente"
          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;
