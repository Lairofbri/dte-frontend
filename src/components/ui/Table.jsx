// src/components/ui/Table.jsx
// Tabla reutilizable con:
// → Columnas configurables
// → Estado de carga con skeleton rows
// → Estado vacío integrado
// → onClick por fila para navegación
// → Accesibilidad completa

import EmptyState from './EmptyState';

// Skeleton row para estado de carga
const SkeletonRow = ({ columnas }) => (
  <tr>
    {Array.from({ length: columnas }).map((_, i) => (
      <td key={i} className="px-4 py-3 border-t border-gray-50">
        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
      </td>
    ))}
  </tr>
);

const Table = ({
  columns,          // [{ key, header, render?, className?, headerClassName? }]
  data     = [],
  isLoading = false,
  onRowClick,
  emptyTitle       = 'Sin resultados',
  emptyDescription = 'No hay datos para mostrar.',
  ariaLabel        = 'Tabla de datos',
  skeletonRows     = 5,
}) => {
  const tieneFilas = data.length > 0;

  return (
    <div className="table-wrapper">
      <table className="table" aria-label={ariaLabel}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={col.headerClassName ?? ''}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            // Skeleton rows durante la carga
            Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonRow key={i} columnas={columns.length} />
            ))
          ) : tieneFilas ? (
            data.map((fila, idx) => (
              <tr
                key={fila.id ?? idx}
                onClick={() => onRowClick?.(fila)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(fila);
                  }
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={col.className ?? ''}
                  >
                    {col.render
                      ? col.render(fila[col.key], fila)
                      : (fila[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          ) : null}
        </tbody>
      </table>

      {/* Empty state fuera de la tabla para mejor semántica */}
      {!isLoading && !tieneFilas && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
    </div>
  );
};

export default Table;
