// src/components/layout/AppLayout.jsx
// Layout principal que envuelve todas las páginas protegidas
// Sidebar + Header + contenido

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header  from './Header';

// Mapear rutas a títulos de página
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Obtener título de la página actual
  const titulo = titulos[location.pathname] ||
    (location.pathname.startsWith('/dtes/') ? 'Detalle DTE' : 'DTE Service');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          titulo={titulo}
        />

        {/* Área de contenido con scroll */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
