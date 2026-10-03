// src/pages/Onboarding.jsx
// Estado de provisión de empresas POS ↔ DTE (Fase 2).
// Administrador: ve el estado de su tenant.
// Plataforma: ve todos los tenants y puede iniciar el alta de empresas.

import { useState }          from 'react';
import { Link }              from 'react-router-dom';
import { Plus, RefreshCw }    from 'lucide-react';
import { useEstadoProvision } from '../hooks/useEstadoProvision';
import { useAuthStore, selectEsPlataforma } from '../store/auth.store';
import { BadgeGenerico }      from '../components/ui/Badge';
import Table                  from '../components/ui/Table';
import Button                 from '../components/ui/Button';
import Spinner                from '../components/ui/Spinner';
import Modal                  from '../components/ui/Modal';
import Input                  from '../components/ui/Input';

const INFO_ESTADO = {
  provisioning:        { label: 'Provisionando',      variant: 'yellow' },
  pending_fiscal_setup: { label: 'Config. fiscal pendiente', variant: 'blue' },
  active:              { label: 'Activa',             variant: 'green' },
  blocked:             { label: 'Bloqueada',          variant: 'red' },
  failed:              { label: 'Fallida',            variant: 'red' },
};

const formatearFecha = (valor) => {
  if (!valor) return '—';
  try {
    return new Date(valor).toLocaleString('es-SV', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const Onboarding = () => {
  const esPlataforma = useAuthStore(selectEsPlataforma);
  const { tenants, isLoading, error, recargar, crearEmpresa, creando } = useEstadoProvision();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ nombre: '', nit: '', nrc: '', email: '' });
  const [errorForm, setErrorForm] = useState(null);

  const abrirCrear = () => {
    setForm({ nombre: '', nit: '', nrc: '', email: '' });
    setErrorForm(null);
    setModalAbierto(true);
  };

  const handleCrear = async () => {
    if (!form.nombre.trim() || !form.nit.trim()) {
      setErrorForm('Nombre y NIT son obligatorios.');
      return;
    }
    setErrorForm(null);
    try {
      await crearEmpresa(form);
      setModalAbierto(false);
    } catch (e) {
      setErrorForm(e?.response?.data?.mensaje ?? 'No se pudo crear la empresa.');
    }
  };

  const columnas = [
    {
      key: 'nombre',
      header: 'Empresa',
      render: (valor, fila) => (
        <div>
          <p className="text-sm font-medium text-gray-800">{valor}</p>
          <p className="text-xs text-gray-400 font-mono">{fila.nit}</p>
        </div>
      ),
    },
    {
      key: 'provisioning_status',
      header: 'Estado de provisión',
      render: (valor, _fila) => {
        const info = INFO_ESTADO[valor] ?? { label: valor ?? '—', variant: 'gray' };
        return (
          <div>
            <BadgeGenerico variant={info.variant}>{info.label}</BadgeGenerico>
            {valor === 'pending_fiscal_setup' && (
              <Link
                to="/configuracion"
                className="text-xs text-primary-600 hover:text-primary-700 hover:underline mt-1 block"
                title="Completar credenciales y configuración fiscal del tenant"
              >
                Completar datos fiscales →
              </Link>
            )}
          </div>
        );
      },
    },
    {
      key: 'tiene_api_key',
      header: 'API Key integración',
      // Fase 4 — separa la API Key técnica de las credenciales oficiales
      // Hacienda. Solo indica presencia; el valor nunca se muestra (spec §3.3).
      render: (valor) => (
        <BadgeGenerico variant={valor === true ? 'green' : valor === false ? 'yellow' : 'gray'}>
          {valor === true ? 'Configurada' : valor === false ? 'Pendiente' : '—'}
        </BadgeGenerico>
      ),
    },
    {
      key: 'last_pos_sync_at',
      header: 'Última sincronización POS',
      render: (valor) => (
        <span className="text-sm text-gray-600">{formatearFecha(valor)}</span>
      ),
    },
    {
      key: 'eventos_pendientes',
      header: 'Eventos pendientes',
      render: (valor) => (
        <span className="text-sm text-gray-600">{valor ?? 0}</span>
      ),
    },
    {
      key: 'eventos_fallidos',
      header: 'Eventos fallidos',
      render: (valor) => (
        <span className={`text-sm ${valor > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
          {valor ?? 0}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Onboarding de empresas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Estado de provisión POS ↔ DTE. La identidad fiscal vive en DTE; el POS mantiene la proyección operativa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={recargar} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          {esPlataforma && (
            <Button onClick={abrirCrear} disabled={creando}>
              <Plus className="w-4 h-4" />
              Nueva empresa
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-4">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : tenants.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">
          No hay empresas registradas.
        </div>
      ) : (
        <Table
          columns={columnas}
          data={tenants}
          emptyTitle="Sin empresas en provisión"
          emptyDescription="Las empresas creadas desde POS o DTE aparecerán aquí."
          ariaLabel="Estado de provisión de empresas"
        />
      )}

      {esPlataforma ? (
        <Modal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          title="Nueva empresa (alta desde DTE)"
        >
          <div className="space-y-4">
            <Input
              label="Nombre"
              required
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Razón social"
            />
            <Input
              label="NIT"
              required
              value={form.nit}
              onChange={(e) => setForm((p) => ({ ...p, nit: e.target.value }))}
              placeholder="0614-000000-000-0"
            />
            <Input
              label="NRC"
              value={form.nrc}
              onChange={(e) => setForm((p) => ({ ...p, nrc: e.target.value }))}
              placeholder="Opcional"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Opcional"
            />

            {errorForm ? (
              <p className="text-sm text-red-600">{errorForm}</p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModalAbierto(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCrear} disabled={creando}>
                {creando ? 'Creando...' : 'Crear empresa'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

export default Onboarding;