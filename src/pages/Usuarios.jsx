// src/pages/Usuarios.jsx
import { useState }            from 'react';
import { Plus, Pencil, PowerOff } from 'lucide-react';
import { useUsuarios }         from '../hooks/useUsuarios';
import { useEstablecimientos } from '../hooks/useEstablecimientos';
import ModalUsuario            from '../components/usuarios/ModalUsuario';
import { BadgeGenerico }       from '../components/ui/Badge';
import Table                   from '../components/ui/Table';
import Button                  from '../components/ui/Button';
import Spinner                 from '../components/ui/Spinner';
import Modal                   from '../components/ui/Modal';

const Usuarios = () => {
  const { usuarios, isLoading, error, crear, actualizar, desactivar } = useUsuarios();
  const { establecimientos } = useEstablecimientos();

  const [modalAbierto,      setModalAbierto]      = useState(false);
  const [seleccionado,      setSeleccionado]      = useState(null);
  const [confirmDesactivar, setConfirmDesactivar] = useState(null);
  const [errorDesactivar,   setErrorDesactivar]   = useState('');
  const [desactivando,      setDesactivando]      = useState(false);

  const abrirCrear  = () => { setSeleccionado(null); setModalAbierto(true); };
  const abrirEditar = (u) => { setSeleccionado(u);   setModalAbierto(true); };

  const handleGuardar = async (datos) => {
    if (seleccionado) await actualizar(seleccionado.id, datos);
    else              await crear(datos);
  };

  const handleDesactivar = async () => {
    if (!confirmDesactivar) return;
    setDesactivando(true);
    setErrorDesactivar('');
    try {
      await desactivar(confirmDesactivar.id);
      setConfirmDesactivar(null);
    } catch (err) {
      setErrorDesactivar(err.response?.data?.mensaje || 'No se pudo desactivar el usuario.');
    } finally {
      setDesactivando(false);
    }
  };

  const columnas = [
    {
      key:    'nombre',
      header: 'Usuario',
      render: (valor, fila) => (
        <div>
          <p className="text-sm font-medium text-gray-800">{valor}</p>
          <p className="text-xs text-gray-400">{fila.email}</p>
        </div>
      ),
    },
    {
      key:    'rol',
      header: 'Rol',
      render: (valor) => (
        <BadgeGenerico variant={valor === 'administrador' ? 'blue' : 'gray'}>
          {valor === 'administrador' ? 'Administrador' : 'Operador'}
        </BadgeGenerico>
      ),
    },
    {
      key:    'establecimiento_id',
      header: 'Establecimiento',
      render: (_, fila) => (
        <span className="text-sm text-gray-600">
          {fila.establecimiento?.nombre ?? '—'}
        </span>
      ),
    },
    {
      key:    'ultimo_login',
      header: 'Último acceso',
      render: (valor) => (
        <span className="text-xs text-gray-400">
          {valor ? new Date(valor).toLocaleDateString('es-SV') : 'Nunca'}
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
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors">
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </button>
          {fila.activo && (
            <button
              onClick={(e) => { e.stopPropagation(); setErrorDesactivar(''); setConfirmDesactivar(fila); }}
              aria-label={`Desactivar ${fila.nombre}`}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
              <PowerOff className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  if (error)     return <div className="card p-8 text-center"><p className="text-gray-500" role="alert">{error}</p></div>;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nuevo usuario
        </Button>
      </div>

      <div className="card">
        <Table
          columns={columnas}
          data={usuarios}
          emptyTitle="Sin usuarios"
          emptyDescription="Crea el primer usuario del sistema."
          ariaLabel="Lista de usuarios"
        />
      </div>

      <ModalUsuario
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onGuardar={handleGuardar}
        usuario={seleccionado}
        establecimientos={establecimientos}
      />

      <Modal isOpen={!!confirmDesactivar} onClose={() => setConfirmDesactivar(null)} title="Desactivar usuario" size="sm">
        {errorDesactivar && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600" role="alert">{errorDesactivar}</p>
          </div>
        )}
        <p className="text-sm text-gray-600 mb-5">
          ¿Desactivar a <span className="font-semibold">{confirmDesactivar?.nombre}</span>?
          No podrá iniciar sesión hasta que sea reactivado.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setConfirmDesactivar(null)} disabled={desactivando}>Cancelar</Button>
          <Button variant="danger" onClick={handleDesactivar} isLoading={desactivando}>Desactivar</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Usuarios;
