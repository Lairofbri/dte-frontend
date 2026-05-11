// src/components/layout/AppLayout.jsx
// Layout principal con sidebar colapsable
// → Desktop: sidebar expandido/colapsado con toggle
// → Móvil: sidebar como overlay

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header  from './Header';

const titulos = {
  '/dashboard':        'Dashboard',
  '/dtes':             'Documentos Tributarios Electrónicos',
  '/dtes/emitir':      'Emitir DTE',
  '/contingencia':     'Contingencia',
  '/configuracion':    'Configuración',
  '/establecimientos': 'Establecimientos',
  '/usuarios':         'Usuarios',
  '/auditoria':        'Auditoría',
};

const AppLayout = () => {
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const titulo = titulos[location.pathname] ||
    (location.pathname.startsWith('/dtes/') ? 'Detalle DTE' : 'DTE Service');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — colapsable en desktop, overlay en móvil */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Contenido principal — se expande cuando el sidebar colapsa */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          titulo={titulo}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
