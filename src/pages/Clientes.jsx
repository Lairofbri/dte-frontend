// src/pages/Clientes.jsx
// Gestión de clientes — listado, búsqueda, crear, editar, eliminar

import { useState, useEffect, useCallback, useId } from 'react';
import { toast }        from 'react-hot-toast';
import { Users, Plus, Pencil, Trash2, RefreshCw, Building2, User } from 'lucide-react';
import {
  buscarClientesApi, crearClienteApi,
  actualizarClienteApi, eliminarClienteApi,
} from '../api/clientes.api';
import ModalCliente from '../components/clientes/ModalCliente';
import Spinner      from '../components/ui/Spinner';
import Button       from '../components/ui/Button';

// ─────────────────────────────────────────────
// HOOK DE ESTADO
// ─────────────────────────────────────────────
const useClientes = () => {
  const [clientes,        setClientes]        = useState([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState(null);
  const [busqueda,        setBusqueda]        = useState('');
  const [filtroTipo,      setFiltroTipo]      = useState('');
  const [contadorRecarga, setContadorRecarga] = useState(0);

  const recargar = useCallback(() => setContadorRecarga(p => p + 1), []);

  useEffect(() => {
    let cancelado = false;
    // Debounce de búsqueda para evitar llamadas en cada tecla
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = { limite: 50 };
        if (busqueda.trim()) params.q = busqueda.trim();
        if (filtroTipo)      params.tipo_cliente = filtroTipo;
        const datos = await buscarClientesApi(params);
        if (!cancelado) setClientes(datos?.clientes ?? []);
      } catch (_) {
        if (!cancelado) setError('No se pudieron cargar los clientes.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    }, busqueda ? 350 : 0);

    return () => { cancelado = true; clearTimeout(timer); };
  }, [busqueda, filtroTipo, contadorRecarga]);

  return {
    clientes, isLoading, error,
    busqueda, setBusqueda,
    filtroTipo, setFiltroTipo,
    recargar,
  };
};

// ─────────────────────────────────────────────
// BADGE TIPO CLIENTE
// ─────────────────────────────────────────────
const BadgeTipo = ({ tipo }) => (
  tipo === 'juridico'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
        <Building2 className="w-3 h-3" aria-hidden="true" /> Jurídico
      </span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-600 border border-gray-200">
        <User className="w-3 h-3" aria-hidden="true" /> Natural
      </span>
);

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const Clientes = () => {
  const {
    clientes, isLoading, error,
    busqueda, setBusqueda,
    filtroTipo, setFiltroTipo,
    recargar,
  } = useClientes();

  const [modalAbierto,    setModalAbierto]    = useState(false);
  const [clienteEditar,   setClienteEditar]   = useState(null);
  const [eliminando,      setEliminando]      = useState(null);
  const searchId = useId();

  const abrirCrear  = ()  => { setClienteEditar(null); setModalAbierto(true); };
  const abrirEditar = (c) => { setClienteEditar(c);    setModalAbierto(true); };
  const cerrarModal = ()  => setModalAbierto(false);

  const onGuardar = async (datos) => {
    if (clienteEditar) {
      await actualizarClienteApi(clienteEditar.id, datos);
      toast.success('Cliente actualizado correctamente.');
    } else {
      await crearClienteApi(datos);
      toast.success('Cliente creado correctamente.');
    }
    recargar();
  };

  const onEliminar = async (cliente) => {
    if (!window.confirm(
      `¿Eliminar a ${cliente.nombre}?\n\nEsta acción no se puede deshacer si tiene DTEs emitidos.`
    )) return;
    setEliminando(cliente.id);
    try {
      await eliminarClienteApi(cliente.id);
      toast.success('Cliente eliminado.');
      recargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar el cliente.');
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} encontrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nuevo cliente
        </Button>
      </div>

      {/* Buscador y filtros */}
      <div className="card">
        <div className="card-body py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor={`${searchId}-busqueda`} className="sr-only">Buscar cliente</label>
              <input
                id={`${searchId}-busqueda`}
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, NIT, DUI, NRC..."
                className="input"
                aria-label="Buscar clientes"
              />
            </div>
            <div>
              <label htmlFor={`${searchId}-tipo`} className="sr-only">Filtrar por tipo</label>
              <select
                id={`${searchId}-tipo`}
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="input min-w-[160px]">
                <option value="">Todos los tipos</option>
                <option value="natural">Persona natural</option>
                <option value="juridico">Persona jurídica</option>
              </select>
            </div>
            <Button variant="secondary" onClick={recargar}
              aria-label="Actualizar listado">
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Listado */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4" role="alert">{error}</p>
            <Button variant="secondary" onClick={recargar}>
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Reintentar
            </Button>
          </div>
        ) : clientes.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-400">
              {busqueda ? 'No se encontraron clientes con esa búsqueda.' : 'Aún no tienes clientes registrados.'}
            </p>
            {!busqueda && (
              <Button onClick={abrirCrear} className="mt-4">
                <Plus className="w-4 h-4" aria-hidden="true" /> Crear primer cliente
              </Button>
            )}
          </div>
        ) : (
          <ul role="list">
            {clientes.map((cliente, idx) => (
              <li key={cliente.id}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                  idx < clientes.length - 1 ? 'border-b border-gray-50' : ''
                }`}>

                {/* Ícono */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  cliente.tipo_cliente === 'juridico'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {cliente.tipo_cliente === 'juridico'
                    ? <Building2 className="w-4 h-4" aria-hidden="true" />
                    : <User      className="w-4 h-4" aria-hidden="true" />
                  }
                </div>

                {/* Datos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {cliente.nombre}
                    </p>
                    <BadgeTipo tipo={cliente.tipo_cliente} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {cliente.tipo_cliente === 'juridico'
                      ? [
                          cliente.nit  && `NIT: ${cliente.nit}`,
                          cliente.nrc  && `NRC: ${cliente.nrc}`,
                          cliente.cod_actividad && cliente.cod_actividad,
                        ].filter(Boolean).join(' · ')
                      : [
                          cliente.tipo_documento && cliente.num_documento
                            && `${cliente.tipo_documento === '13' ? 'DUI' : cliente.tipo_documento}: ${cliente.num_documento}`,
                          cliente.correo,
                        ].filter(Boolean).join(' · ')
                    }
                  </p>
                </div>

                {/* DTEs */}
                {cliente.total_dtes > 0 && (
                  <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                    {cliente.total_dtes} DTE{cliente.total_dtes !== 1 ? 's' : ''}
                  </span>
                )}

                {/* Acciones */}
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => abrirEditar(cliente)}
                    aria-label={`Editar cliente ${cliente.nombre}`}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => onEliminar(cliente)}
                    disabled={eliminando === cliente.id}
                    aria-label={`Eliminar cliente ${cliente.nombre}`}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ModalCliente
        isOpen={modalAbierto}
        onClose={cerrarModal}
        onGuardar={onGuardar}
        cliente={clienteEditar}
      />
    </div>
  );
};

export default Clientes;
