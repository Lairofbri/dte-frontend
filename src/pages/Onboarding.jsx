// src/pages/Onboarding.jsx
// Estado de provisión de empresas POS ↔ DTE (Fase 2).
// Administrador: ve el estado de su tenant.
// Plataforma: ve todos los tenants y puede iniciar el alta de empresas.

import { useState, useEffect } from 'react';
import { Link }              from 'react-router-dom';
import { Plus, RefreshCw, Pencil } from 'lucide-react';
import { useEstadoProvision } from '../hooks/useEstadoProvision';
import { useAuthStore, selectEsPlataforma } from '../store/auth.store';
import { obtenerCatalogoApi } from '../api/catalogos.api';
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

// Máscara del NIT salvadoreño: ####-######-###-# (14 dígitos).
const formatearNit = (valor) => {
  const digitos = String(valor).replace(/\D/g, '').slice(0, 14);
  const partes = [
    digitos.slice(0, 4),
    digitos.slice(4, 10),
    digitos.slice(10, 13),
    digitos.slice(13, 14),
  ].filter(Boolean);
  return partes.join('-');
};

// Nombre visible en el selector de login: comercial si existe, si no la razón social.
const nombreVisible = (fila) => fila.nombre_comercial || fila.nombre;

const Onboarding = () => {
  const esPlataforma = useAuthStore(selectEsPlataforma);
  const {
    tenants, isLoading, error, recargar,
    crearEmpresa, creando,
    actualizarEmpresa, actualizando,
  } = useEstadoProvision();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({
    nombre: '', nombre_comercial: '', nit: '', nrc: '',
    email_admin: '', password: '', confirmar_password: '',
    nombre_usuario: '', apellido: '',
    crearPos: false, pin: '',
    est_nombre: '', est_direccion: '', est_departamento_cod: '', est_municipio_cod: '',
    est_cod_estable_mh: '', est_cod_punto_venta_mh: '',
  });
  const [errorForm, setErrorForm] = useState(null);

  // Catálogo CAT-012 (departamentos) para el establecimiento fiscal inicial.
  const [departamentos, setDepartamentos] = useState([]);
  useEffect(() => {
    let cancelado = false;
    obtenerCatalogoApi('departamento')
      .then((lista) => { if (!cancelado) setDepartamentos(lista ?? []); })
      .catch(() => { if (!cancelado) setDepartamentos([]); });
    return () => { cancelado = true; };
  }, []);

  // Edición (2026-10-10) — solo rol plataforma. El NIT es inmutable.
  const [tenantEditando, setTenantEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({
    nombre: '', nombre_comercial: '', nrc: '',
    email_admin: '', nombre_admin: '', password_admin: '', confirmar_password_admin: '',
  });
  const [errorEdit, setErrorEdit] = useState(null);

  const abrirCrear = () => {
    setForm({
      nombre: '', nombre_comercial: '', nit: '', nrc: '',
      email_admin: '', password: '', confirmar_password: '',
      nombre_usuario: '', apellido: '',
      crearPos: false, pin: '',
      est_nombre: '', est_direccion: '', est_departamento_cod: '', est_municipio_cod: '',
      est_cod_estable_mh: '', est_cod_punto_venta_mh: '',
    });
    setErrorForm(null);
    setModalAbierto(true);
  };

  const abrirEditar = (fila) => {
    setFormEdit({
      nombre:               fila.nombre               ?? '',
      // Solo pre-llenar el nombre comercial si es distinto de la razón social:
      // el backend guarda el fallback (nombre) cuando no se definió, y mostrarlo
      // duplicado en edición es confuso.
      nombre_comercial:     (fila.nombre_comercial && fila.nombre_comercial !== fila.nombre)
                             ? fila.nombre_comercial
                             : '',
      nrc:                  fila.nrc                  ?? '',
      email_admin:          fila.admin?.email         ?? '',
      nombre_admin:         fila.admin?.nombre        ?? '',
      password_admin:       '',
      confirmar_password_admin: '',
    });
    setErrorEdit(null);
    setTenantEditando(fila);
  };

  const cerrarEditar = () => {
    setTenantEditando(null);
    setErrorEdit(null);
  };

  const handleCrear = async () => {
    if (!form.nombre.trim()) {
      setErrorForm('El nombre de la empresa (razón social) es obligatorio.');
      return;
    }
    if (form.nit.replace(/\D/g, '').length !== 14) {
      setErrorForm('El NIT debe tener 14 dígitos (formato 0000-000000-000-0).');
      return;
    }
    if (!form.email_admin.trim() || !form.nombre_usuario.trim()) {
      setErrorForm('El email y el nombre del administrador son obligatorios.');
      return;
    }
    if (form.password !== form.confirmar_password) {
      setErrorForm('La contraseña y su confirmación no coinciden.');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,50}$/.test(form.password)) {
      setErrorForm('La contraseña debe tener entre 8 y 50 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.');
      return;
    }
    if (form.crearPos && !/^\d{6}$/.test(form.pin.trim())) {
      setErrorForm('El PIN (usuario POS) debe tener exactamente 6 dígitos.');
      return;
    }
    // Establecimiento fiscal inicial (bootstrap de la empresa).
    if (form.est_nombre.trim().length < 3) {
      setErrorForm('El nombre del establecimiento debe tener al menos 3 caracteres.');
      return;
    }
    if (form.est_direccion.trim().length < 5) {
      setErrorForm('La dirección del establecimiento debe tener al menos 5 caracteres.');
      return;
    }
    if (!form.est_departamento_cod) {
      setErrorForm('Selecciona el departamento del establecimiento.');
      return;
    }
    if (!/^\d{2}$/.test(form.est_municipio_cod.trim())) {
      setErrorForm('El código de municipio debe tener 2 dígitos (del documento de Hacienda).');
      return;
    }
    if (!/^[A-Z0-9]{4}$/.test(form.est_cod_estable_mh.trim().toUpperCase())) {
      setErrorForm('El código de establecimiento MH debe tener 4 caracteres alfanuméricos.');
      return;
    }
    if (!/^[A-Z0-9]{4}$/.test(form.est_cod_punto_venta_mh.trim().toUpperCase())) {
      setErrorForm('El código de punto de venta MH debe tener 4 caracteres alfanuméricos.');
      return;
    }
    setErrorForm(null);
    try {
      // El hook extrae los campos est_* para armar el objeto `establecimiento`.
      await crearEmpresa({
        ...form,
        establecimiento: {
          nombre:             form.est_nombre,
          direccion:          form.est_direccion,
          departamento_cod:   form.est_departamento_cod,
          municipio_cod:      form.est_municipio_cod,
          cod_estable_mh:     form.est_cod_estable_mh,
          cod_punto_venta_mh: form.est_cod_punto_venta_mh,
        },
      });
      setModalAbierto(false);
    } catch (e) {
      setErrorForm(e?.response?.data?.mensaje ?? 'No se pudo crear la empresa.');
    }
  };

  // La contraseña del admin es opcional en edición: vacía = no cambia.
  const handleEditar = async () => {
    if (!formEdit.nombre.trim()) {
      setErrorEdit('El nombre de la empresa (razón social) es obligatorio.');
      return;
    }
    if (!formEdit.email_admin.trim() || !formEdit.nombre_admin.trim()) {
      setErrorEdit('El email y el nombre del administrador son obligatorios.');
      return;
    }
    if (formEdit.password_admin) {
      if (formEdit.password_admin !== formEdit.confirmar_password_admin) {
        setErrorEdit('La contraseña y su confirmación no coinciden.');
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,50}$/.test(formEdit.password_admin)) {
        setErrorEdit('La contraseña debe tener entre 8 y 50 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.');
        return;
      }
    }
    setErrorEdit(null);
    try {
      await actualizarEmpresa({
        tenantId:        tenantEditando.id,
        nombre:          formEdit.nombre,
        nombre_comercial: formEdit.nombre_comercial,
        nrc:             formEdit.nrc,
        email_admin:     formEdit.email_admin,
        nombre_admin:    formEdit.nombre_admin,
        password_admin:  formEdit.password_admin || null,
      });
      cerrarEditar();
    } catch (e) {
      setErrorEdit(e?.response?.data?.mensaje ?? 'No se pudo actualizar la empresa.');
    }
  };

  const columnas = [
    {
      key: 'nombre',
      header: 'Empresa',
      render: (valor, fila) => (
        <div>
          <p className="text-sm font-medium text-gray-800">{nombreVisible(fila)}</p>
          {fila.nombre_comercial && fila.nombre_comercial !== fila.nombre ? (
            <p className="text-xs text-gray-400">{fila.nombre}</p>
          ) : null}
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
    ...(esPlataforma
      ? [{
          key: 'acciones',
          header: 'Acciones',
          render: (_valor, fila) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => abrirEditar(fila)}
              aria-label={`Editar ${nombreVisible(fila)}`}
            >
              <Pencil className="w-4 h-4" />
              Editar
            </Button>
          ),
        }]
      : []),
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
              label="Nombre de la empresa (razón social)"
              required
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Razón social que exige Hacienda"
            />
            <Input
              label="Nombre para iniciar sesión"
              value={form.nombre_comercial}
              onChange={(e) => setForm((p) => ({ ...p, nombre_comercial: e.target.value }))}
              placeholder="Opcional. Si lo dejas vacío se usa la razón social"
              helperText="Este es el nombre que verán los usuarios al seleccionar la empresa en el login."
            />
            <Input
              label="NIT"
              required
              value={form.nit}
              onChange={(e) => setForm((p) => ({ ...p, nit: formatearNit(e.target.value) }))}
              placeholder="0614-000000-000-0"
              maxLength={17}
              helperText="14 dígitos con formato automático."
            />
            <Input
              label="NRC"
              value={form.nrc}
              onChange={(e) => setForm((p) => ({ ...p, nrc: e.target.value }))}
              placeholder="Opcional"
            />

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-800 mb-1">
                Establecimiento fiscal inicial
              </p>
              <p className="text-xs text-gray-500 mb-3">
                La empresa se crea con este establecimiento ya listo para
                emitir (los códigos MH vienen del documento de acreditamiento
                de Hacienda). El administrador queda asignado a él.
              </p>
              <div className="space-y-4">
                <Input
                  label="Nombre del establecimiento"
                  required
                  value={form.est_nombre}
                  onChange={(e) => setForm((p) => ({ ...p, est_nombre: e.target.value }))}
                  placeholder="Ej.: Casa Matriz"
                />
                <Input
                  label="Dirección"
                  required
                  value={form.est_direccion}
                  onChange={(e) => setForm((p) => ({ ...p, est_direccion: e.target.value }))}
                  placeholder="Dirección exacta de la sucursal"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="est-departamento">
                      Departamento <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                    </label>
                    <select
                      id="est-departamento"
                      className="input"
                      value={form.est_departamento_cod}
                      onChange={(e) => setForm((p) => ({ ...p, est_departamento_cod: e.target.value }))}
                    >
                      <option value="">Seleccionar...</option>
                      {departamentos.map((d) => (
                        <option key={d.codigo} value={d.codigo}>
                          {d.codigo} — {d.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Código de municipio"
                    required
                    value={form.est_municipio_cod}
                    onChange={(e) => setForm((p) => ({ ...p, est_municipio_cod: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                    placeholder="2 dígitos (00-99)"
                    maxLength={2}
                    helperText="Del documento de acreditamiento de Hacienda."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Código establecimiento (MH)"
                    required
                    value={form.est_cod_estable_mh}
                    onChange={(e) => setForm((p) => ({ ...p, est_cod_estable_mh: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) }))}
                    placeholder="Ej.: M001"
                    maxLength={4}
                    helperText="4 caracteres del documento de Hacienda."
                  />
                  <Input
                    label="Código punto de venta (MH)"
                    required
                    value={form.est_cod_punto_venta_mh}
                    onChange={(e) => setForm((p) => ({ ...p, est_cod_punto_venta_mh: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) }))}
                    placeholder="Ej.: P001"
                    maxLength={4}
                    helperText="4 caracteres del documento de Hacienda."
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-800 mb-1">
                Usuario administrador (DTE)
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Toda empresa necesita DTE: este administrador se crea siempre en
                el nuevo tenant.
              </p>
              <div className="space-y-4">
                <Input
                  label="Email del administrador"
                  type="email"
                  required
                  value={form.email_admin}
                  onChange={(e) => setForm((p) => ({ ...p, email_admin: e.target.value }))}
                  placeholder="admin@empresa.sv"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nombre"
                    required
                    value={form.nombre_usuario}
                    onChange={(e) => setForm((p) => ({ ...p, nombre_usuario: e.target.value }))}
                    placeholder="Nombre del administrador"
                  />
                  <Input
                    label="Apellido"
                    value={form.apellido}
                    onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
                <Input
                  label="Contraseña"
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Mín. 8 caracteres, mayúscula, minúscula, número y símbolo"
                />
                <Input
                  label="Confirmar contraseña"
                  type="password"
                  required
                  value={form.confirmar_password}
                  onChange={(e) => setForm((p) => ({ ...p, confirmar_password: e.target.value }))}
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div>
                  <p className="text-sm font-medium text-gray-800">Acceso POS</p>
                  <p className="text-xs text-gray-500">
                    No todas las empresas necesitan un POS. Solo se crea el
                    usuario POS si activás esta opción.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.crearPos}
                  onClick={() => setForm((p) => ({ ...p, crearPos: !p.crearPos, pin: '' }))}
                  className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    form.crearPos ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.crearPos ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {form.crearPos ? (
                <div className="space-y-4 mt-3">
                  <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
                    El mismo administrador ({form.email_admin || 'email de arriba'}) se
                    creará en el POS con todos los permisos (rol administrador). Solo
                    hace falta su PIN de acceso.
                  </p>
                  <Input
                    label="PIN (usuario POS)"
                    required
                    value={form.pin}
                    onChange={(e) => setForm((p) => ({ ...p, pin: e.target.value }))}
                    placeholder="6 dígitos"
                    maxLength={6}
                    helperText="El PIN es de uso exclusivo del POS."
                  />
                </div>
              ) : null}
            </div>

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

      {/* Edición de empresa (rol plataforma). NIT inmutable: se muestra pero
          no se envía (el backend lo rechaza con 400 si llega). */}
      {esPlataforma && tenantEditando ? (
        <Modal
          isOpen={!!tenantEditando}
          onClose={cerrarEditar}
          title="Editar empresa"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
              También podés corregir aquí las credenciales del administrador
              inicial (email, nombre y contraseña) si las olvidaste. La
              contraseña vacía no la cambia.
            </p>
            <Input
              label="Nombre de la empresa (razón social)"
              required
              value={formEdit.nombre}
              onChange={(e) => setFormEdit((p) => ({ ...p, nombre: e.target.value }))}
            />
            <Input
              label="Nombre para iniciar sesión (opcional)"
              value={formEdit.nombre_comercial}
              onChange={(e) => setFormEdit((p) => ({ ...p, nombre_comercial: e.target.value }))}
              helperText="Solo si es distinto de la razón social. Vacío = se usa la razón social en el login."
            />
            <Input
              label="NIT"
              value={formEdit.nit}
              disabled
              helperText="El NIT es la identidad fiscal del emisor y no se puede modificar."
            />
            <Input
              label="NRC"
              value={formEdit.nrc}
              onChange={(e) => setFormEdit((p) => ({ ...p, nrc: e.target.value }))}
              placeholder="Opcional"
            />

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-800 mb-1">
                Usuario administrador (DTE)
              </p>
              <p className="text-xs text-gray-500 mb-3">
                El administrador que se creó al dar de alta la empresa.
              </p>
              <div className="space-y-4">
                <Input
                  label="Email del administrador"
                  type="email"
                  required
                  value={formEdit.email_admin}
                  onChange={(e) => setFormEdit((p) => ({ ...p, email_admin: e.target.value }))}
                  placeholder="admin@empresa.sv"
                />
                <Input
                  label="Nombre"
                  required
                  value={formEdit.nombre_admin}
                  onChange={(e) => setFormEdit((p) => ({ ...p, nombre_admin: e.target.value }))}
                  placeholder="Nombre del administrador"
                />
                <Input
                  label="Nueva contraseña"
                  type="password"
                  value={formEdit.password_admin}
                  onChange={(e) => setFormEdit((p) => ({ ...p, password_admin: e.target.value }))}
                  placeholder="Opcional: déjalo vacío para no cambiarla"
                />
                <Input
                  label="Confirmar nueva contraseña"
                  type="password"
                  value={formEdit.confirmar_password_admin}
                  onChange={(e) => setFormEdit((p) => ({ ...p, confirmar_password_admin: e.target.value }))}
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>

            {errorEdit ? (
              <p className="text-sm text-red-600">{errorEdit}</p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={cerrarEditar}>
                Cancelar
              </Button>
              <Button onClick={handleEditar} disabled={actualizando}>
                {actualizando ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

export default Onboarding;