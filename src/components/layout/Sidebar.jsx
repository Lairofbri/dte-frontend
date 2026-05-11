// src/components/layout/Sidebar.jsx
// Sidebar colapsable — expandido muestra icono + texto, colapsado solo iconos
// En móvil se comporta como overlay

import React          from 'react';
import { NavLink }    from 'react-router-dom';
import {
  LayoutDashboard, FileText, AlertTriangle,
  Settings, Building2, Users, ClipboardList,
  ChevronLeft, ChevronRight, Zap,
} from 'lucide-react';
import { useAuthStore, selectEsAdmin, selectUsuario } from '../../store/auth.store';

const navItems = [
  { label: 'Dashboard',    path: '/dashboard',    icon: LayoutDashboard, adminOnly: false },
  { label: 'DTEs',         path: '/dtes',          icon: FileText,         adminOnly: false },
  { label: 'Contingencia', path: '/contingencia',  icon: AlertTriangle,    adminOnly: false },
];

const adminItems = [
  { label: 'Configuración',    path: '/configuracion',    icon: Settings     },
  { label: 'Establecimientos', path: '/establecimientos', icon: Building2    },
  { label: 'Usuarios',         path: '/usuarios',          icon: Users        },
  { label: 'Auditoría',        path: '/auditoria',         icon: ClipboardList },
];

const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }) => {
  const usuario = useAuthStore(selectUsuario);
  const esAdmin = useAuthStore(selectEsAdmin);

  // En móvil nunca colapsar — el toggle es solo para desktop
  // Detectar si estamos en desktop via CSS media query
  const [esDesktop, setEsDesktop] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setEsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Solo colapsar si estamos en desktop
  const esColapsado = isCollapsed && esDesktop;

  const renderLink = (item) => (
    <NavLink
      key={item.path}
      to={item.path}
      onClick={() => { if (window.innerWidth < 1024) onClose(); }}
      title={esColapsado ? item.label : undefined}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'active' : ''} ${esColapsado ? 'justify-center px-2' : ''}`
      }
    >
      <item.icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
      {!isCollapsed && <span>{item.label}</span>}
    </NavLink>
  );

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 bg-sidebar-bg flex flex-col
          transition-all duration-300 ease-in-out
          lg:static lg:z-auto lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${esColapsado ? 'lg:w-16' : ''}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-white/10 h-16 shrink-0
          ${isCollapsed ? 'justify-center px-2' : 'px-5 gap-2.5'}`}
        >
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          {!esColapsado && (
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm font-sans leading-none truncate">
                DTE Service
              </p>
              <p className="text-sidebar-text text-xs mt-0.5 truncate">
                Facturación Electrónica
              </p>
            </div>
          )}
        </div>

        {/* Establecimiento activo */}
        {!isCollapsed && usuario?.establecimiento && (
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

        {/* Navegación */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map(renderLink)}

          {esAdmin && (
            <>
              {!esColapsado && (
                <div className="pt-4 pb-2 px-2">
                  <p className="text-sidebar-text text-xs font-medium uppercase tracking-wider">
                    Administración
                  </p>
                </div>
              )}
              {esColapsado && <div className="pt-2 border-t border-white/10 mt-2" />}
              {adminItems.map(renderLink)}
            </>
          )}
        </nav>

        {/* Footer — usuario + botón colapsar */}
        <div className={`border-t border-white/10 p-3 flex items-center
          ${esColapsado ? 'flex-col gap-2' : 'gap-3'}`}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">
              {usuario?.nombre?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>

          {/* Nombre — solo expandido */}
          {!esColapsado && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{usuario?.nombre}</p>
              <p className="text-sidebar-text text-xs capitalize">{usuario?.rol}</p>
            </div>
          )}

          {/* Botón colapsar — solo desktop */}
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            className="hidden lg:flex p-1.5 rounded-lg text-sidebar-text hover:text-white hover:bg-sidebar-hover transition-colors shrink-0"
          >
            {isCollapsed
              ? <ChevronRight className="w-4 h-4" aria-hidden="true" />
              : <ChevronLeft  className="w-4 h-4" aria-hidden="true" />
            }
          </button>

          {/* Cerrar en móvil */}
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
