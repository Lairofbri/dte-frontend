// src/components/layout/Sidebar.jsx
// Sidebar con menús expandibles (Principal / Administración)
// Desktop: sidebar fijo colapsable | Móvil/Tablet: overlay
// DTEs tiene submenú desplegable: Listado / Emitir

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, AlertTriangle, ReceiptText,
  Settings, Building2, Users, ClipboardList, UserSquare2,
  ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';
import { useAuthStore, selectEsAdmin, selectUsuario } from '../../store/auth.store';

// ── Datos estáticos de menú ──
const menuPrincipal = [
  { label: 'Dashboard',    path: '/dashboard',    icon: LayoutDashboard },
  { label: 'Contingencia', path: '/contingencia',  icon: AlertTriangle  },
  { label: 'Clientes',     path: '/clientes',      icon: UserSquare2     },
];

const dteSubmenu = [
  { label: 'Listado', path: '/dtes'        },
  { label: 'Emitir',  path: '/dtes/emitir' },
];

const menuAdministracion = [
  { label: 'Configuración',    path: '/configuracion',    icon: Settings      },
  { label: 'Establecimientos', path: '/establecimientos', icon: Building2     },
  { label: 'Usuarios',         path: '/usuarios',         icon: Users         },
  { label: 'Auditoría',        path: '/auditoria',        icon: ClipboardList },
];

// ── Link del menú ──
const SidebarLink = ({ item, esColapsado, onClose, indentado }) => {
  const cerrarMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) onClose();
  };

  return (
    <NavLink
      to={item.path}
      onClick={cerrarMobile}
      title={esColapsado ? item.label : undefined}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'active' : ''} ${
          esColapsado ? 'justify-center px-2' : indentado ? 'pl-11 text-[13px]' : ''
        }`
      }
    >
      {item.icon ? <item.icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" /> : null}
      {!esColapsado ? <span>{item.label}</span> : null}
    </NavLink>
  );
};

// ── Submenú DTEs ──
const DTEItem = ({ esColapsado, onClose }) => {
  const [abierto, setAbierto] = useState(false);
  const cerrarMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) onClose();
  };

  if (esColapsado) {
    return (
      <SidebarLink
        item={{ label: 'DTEs', path: '/dtes', icon: FileText }}
        esColapsado={esColapsado}
        onClose={onClose}
      />
    );
  }

  return (
    <div>
      <button
        onClick={() => setAbierto((p) => !p)}
        className={`sidebar-link w-full justify-between ${abierto ? 'bg-sidebar-hover text-white' : ''}`}
      >
        <span className="flex items-center gap-3">
          <FileText className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
          DTEs
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="submenu-collapse"
        style={{ gridTemplateRows: abierto ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 py-0.5">
            {dteSubmenu.map((sub) => (
              <NavLink
                key={sub.path}
                to={sub.path}
                onClick={cerrarMobile}
                className={({ isActive }) =>
                  `sidebar-link pl-11 text-[13px] ${isActive ? 'active' : ''}`
                }
              >
                {sub.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Cabecera de sección expandible ──
const SectionHeader = ({ label, abierto, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center gap-2 px-3 py-2.5 text-sidebar-text text-[11px] font-medium uppercase tracking-wider hover:text-white hover:bg-sidebar-hover rounded-lg transition-colors"
  >
    <ChevronDown
      className={`w-3.5 h-3.5 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
    />
    {label}
  </button>
);

// ── Sidebar principal ──
const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const usuario = useAuthStore(selectUsuario);
  const esAdmin  = useAuthStore(selectEsAdmin);

  const [principalAbierto, setPrincipalAbierto] = useState(true);
  const [adminAbierto,     setAdminAbierto]     = useState(true);

  const [esDesktop, setEsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setEsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const esColapsado = isCollapsed && esDesktop;

  return (
    <>
      {/* Overlay móvil / tablet */}
      {isOpen ? (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        aria-label="Navegación principal"
        className={`
          fixed top-0 left-0 h-full z-30 bg-sidebar-bg flex flex-col
          transition-all duration-300 ease-in-out
          lg:static lg:z-auto lg:translate-x-0
          ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full'}
          ${esColapsado ? 'lg:w-16' : 'lg:w-64'}
        `}
      >
        {/* ── Logo DTE Flash ── */}
        <div
          className={`flex items-center border-b border-white/10 h-16 shrink-0 ${
            esColapsado ? 'justify-center px-2' : 'px-5 gap-2.5'
          }`}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-primary-900/20">
            <ReceiptText className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          {!esColapsado ? (
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm font-sans leading-none truncate">
                DTE Flash
              </p>
              <p className="text-sidebar-text text-[11px] mt-0.5 truncate">
                Facturación Electrónica
              </p>
            </div>
          ) : null}
        </div>

        {/* ── Establecimiento activo ── */}
        {!esColapsado && usuario?.establecimiento ? (
          <div className="px-5 py-3 border-b border-white/10">
            <p className="text-sidebar-text text-[11px]">Establecimiento</p>
            <p className="text-white text-sm font-medium truncate mt-0.5">
              {usuario.establecimiento.nombre}
            </p>
            <p className="text-primary-400 text-[11px] font-mono mt-0.5">
              {usuario.establecimiento.cod_estable_mh}
            </p>
          </div>
        ) : null}

        {/* ── Navegación ── */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto scrollbar-thin space-y-0.5">
          {/* ========== PRINCIPAL ========== */}
          {!esColapsado ? (
            <SectionHeader
              label="Principal"
              abierto={principalAbierto}
              onToggle={() => setPrincipalAbierto((p) => !p)}
            />
          ) : (
            <div className="flex justify-center py-1.5">
              <div className="w-6 h-px bg-white/20 rounded-full" />
            </div>
          )}

          {principalAbierto || esColapsado ? (
            <>
              <SidebarLink
                item={menuPrincipal[0]}
                esColapsado={esColapsado}
                onClose={onClose}
              />
              <DTEItem esColapsado={esColapsado} onClose={onClose} />
              {menuPrincipal.slice(1).map((item) => (
                <SidebarLink
                  key={item.path}
                  item={item}
                  esColapsado={esColapsado}
                  onClose={onClose}
                />
              ))}
            </>
          ) : null}

          {/* ========== ADMINISTRACIÓN (solo admin) ========== */}
          {esAdmin ? (
            <>
              {!esColapsado ? (
                <SectionHeader
                  label="Administración"
                  abierto={adminAbierto}
                  onToggle={() => setAdminAbierto((p) => !p)}
                />
              ) : (
                <div className="flex justify-center py-1.5 mt-1">
                  <div className="w-6 h-px bg-white/20 rounded-full" />
                </div>
              )}

              {adminAbierto || esColapsado ? (
                menuAdministracion.map((item) => (
                  <SidebarLink
                    key={item.path}
                    item={item}
                    esColapsado={esColapsado}
                    onClose={onClose}
                  />
                ))
              ) : null}
            </>
          ) : null}
        </nav>

        {/* ── Footer: avatar + colapsar ── */}
        <div
          className={`border-t border-white/10 p-3 flex items-center ${
            esColapsado ? 'flex-col gap-2' : 'gap-3'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0 shadow">
            <span className="text-white text-sm font-semibold">
              {usuario?.nombre?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>

          {!esColapsado ? (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{usuario?.nombre}</p>
              <p className="text-sidebar-text text-xs capitalize">{usuario?.rol}</p>
            </div>
          ) : null}

          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            className="hidden lg:flex p-1.5 rounded-lg text-sidebar-text hover:text-white hover:bg-sidebar-hover transition-colors shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          <button
            onClick={onClose}
            aria-label="Cerrar menú de navegación"
            className="lg:hidden p-1.5 rounded-lg text-sidebar-text hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
