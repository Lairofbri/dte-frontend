// src/pages/Establecimientos.jsx
// Gestión de establecimientos/sucursales — solo administradores

import { useState }               from 'react';
import { Plus, Pencil, PowerOff } from 'lucide-react';
import { useEstablecimientos }    from '../hooks/useEstablecimientos';
import ModalEstablecimiento       from '../components/establecimientos/ModalEstablecimiento';
import { BadgeGenerico }          from '../components/ui/Badge';
import Table                      from '../components/ui/Table';
import Button                     from '../components/ui/Button';
import Spinner                    from '../components/ui/Spinner';
import Modal                      from '../components/ui/Modal';

const Establecimientos = () => {
  const {
    establecimientos, isLoading, error,
    crear, actualizar, desactivar,
  } = useEstablecimientos();

  // Todos los hooks ANTES de returns condicionales
  const [modalAbierto,    setModalAbierto]    = useState(false);
  const [seleccionado,    setSeleccionado]    = useState(null);
  const [confirmDesactivar, setConfirmDesactivar] = useState(null);

  const abrirCrear = () => {
    setSeleccionado(null);
    setModalAbierto(true);
  };

  const abrirEditar = (est) => {
    setSeleccionado(est);
    setModalAbierto(true);
  };

  const handleGuardar = async (datos) => {
    if (seleccionado) {
      await actualizar(seleccionado.id, datos);
    } else {
      await crear(datos);
    }
  };

  const handleDesactivar = async () => {
    if (!confirmDesactivar) return;
    await desactivar(confirmDesactivar.id);
    setConfirmDesactivar(null);
  };

  // Columnas de la tabla
  const columnas = [
    {
      key:    'nombre',
      header: 'Nombre',
      render: (valor, fila) => (
        <div>
          <p className="text-sm font-medium text-gray-800">{valor}</p>
          <p className="text-xs text-gray-400 font-mono">{fila.cod_estable_mh}</p>
        </div>
      ),
    },
    {
      key:    'tipo',
      header: 'Tipo',
      render: (valor) => {
        const tipos = { '02': 'Casa Matriz', '07': 'Sucursal', '20': 'Empresa en Casa' };
        return <span className="text-sm text-gray-600">{tipos[valor] ?? valor}</span>;
      },
    },
    {
      key:    'direccion',
      header: 'Dirección',
      render: (valor) => (
        <span className="text-sm text-gray-600 max-w-[200px] truncate block">
          {valor ?? '—'}
        </span>
      ),
    },
    {
      key:    'activo',
      header: 'Estado',
      render: (valor) => (
        <BadgeGenerico variant={valor ? 'green' : 'gray'}>
          {valor ? 'Activo' : 'Inactivo'}
        </BadgeGenerico>
      ),
    },
    {
      key:    'id',
      header: 'Acciones',
      render: (_, fila) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); abrirEditar(fila); }}
            aria-label={`Editar ${fila.nombre}`}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </button>
          {fila.activo && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDesactivar(fila); }}
              aria-label={`Desactivar ${fila.nombre}`}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              <PowerOff className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500" role="alert">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Establecimientos</h1>
          <p className="page-subtitle">
            {establecimientos.length} sucursal{establecimientos.length !== 1 ? 'es' : ''} registrada{establecimientos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nueva sucursal
        </Button>
      </div>

      {/* Tabla */}
      <div className="card">
        <Table
          columns={columnas}
          data={establecimientos}
          emptyTitle="Sin establecimientos"
          emptyDescription="Crea tu primera sucursal para comenzar."
          ariaLabel="Lista de establecimientos"
        />
      </div>

      {/* Modal crear/editar */}
      <ModalEstablecimiento
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onGuardar={handleGuardar}
        establecimiento={seleccionado}
      />

      {/* Modal confirmar desactivar */}
      <Modal
        isOpen={!!confirmDesactivar}
        onClose={() => setConfirmDesactivar(null)}
        title="Desactivar establecimiento"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-5">
          ¿Estás seguro de que deseas desactivar{' '}
          <span className="font-semibold">{confirmDesactivar?.nombre}</span>?
          Los usuarios asignados no podrán emitir DTEs desde esta sucursal.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmDesactivar(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDesactivar}>
            Desactivar
          </Button>
        </div>
      </Modal>

    </div>
  );
};

export default Establecimientos;
