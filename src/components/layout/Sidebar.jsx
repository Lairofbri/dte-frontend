// src/components/layout/Sidebar.jsx
// Sidebar de navegación principal
// Colapsable en móvil, fijo en desktop

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Settings,
  Building2,
  Users,
  ClipboardList,
  ChevronLeft,
  Zap,
} from 'lucide-react';
import { useAuthStore, selectEsAdmin, selectUsuario } from '../../store/auth.store';

// ─────────────────────────────────────────────
// Definición de rutas del sidebar
// ─────────────────────────────────────────────
const navItems = [
  {
    label: 'Dashboard',
    path:  '/dashboard',
    icon:  LayoutDashboard,
    adminOnly: false,
  },
  {
    label: 'DTEs',
    path:  '/dtes',
    icon:  FileText,
    adminOnly: false,
  },
  {
    label: 'Contingencia',
    path:  '/contingencia',
    icon:  AlertTriangle,
    adminOnly: false,
  },
];

const adminItems = [
  {
    label: 'Configuración',
    path:  '/configuracion',
    icon:  Settings,
  },
  {
    label: 'Establecimientos',
    path:  '/establecimientos',
    icon:  Building2,
  },
  {
    label: 'Usuarios',
    path:  '/usuarios',
    icon:  Users,
  },
  {
    label: 'Auditoría',
    path:  '/auditoria',
    icon:  ClipboardList,
  },
];

const Sidebar = ({ isOpen, onClose }) => {
  const usuario = useAuthStore(selectUsuario);
  const esAdmin = useAuthStore(selectEsAdmin);

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 w-64
          bg-sidebar-bg flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm font-sans leading-none">DTE Service</p>
              <p className="text-sidebar-text text-xs mt-0.5">Facturación Electrónica</p>
            </div>
          </div>
          {/* Cerrar en móvil */}
          <button
            onClick={onClose}
            className="lg:hidden text-sidebar-text hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Establecimiento activo */}
        {usuario?.establecimiento && (
          <div className="px-5 py-3 border-b border-white/10">
            <p className="text-sidebar-text text-xs">Establecimiento</p>
            <p className="text-white text-sm font-medium truncate mt-0.5">
              {usuario.establecimiento.nombre}
            </p>
            <p className="text-primary-400 text-xs font-mono mt-0.5">
              {usuario.establecimiento.cod_estable_mh}
            </p>
          </div>
        )}

        {/* Navegación principal */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {item.label}
            </NavLink>
          ))}

          {/* Sección admin */}
          {esAdmin && (
            <>
              <div className="pt-4 pb-2 px-3">
                <p className="text-sidebar-text text-xs font-medium uppercase tracking-wider">
                  Administración
                </p>
              </div>
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''}`
                  }
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer del sidebar — usuario actual */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-semibold">
                {usuario?.nombre?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{usuario?.nombre}</p>
              <p className="text-sidebar-text text-xs capitalize">{usuario?.rol}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
