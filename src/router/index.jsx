// src/router/index.jsx
// Configuración de rutas con protección por autenticación y rol

import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute  from './ProtectedRoute';
import AdminRoute      from './AdminRoute';
import AppLayout       from '../components/layout/AppLayout';

// Páginas
import Login           from '../pages/Login';
import Dashboard       from '../pages/Dashboard';
import DTEListado      from '../pages/DTEs/DTEListado';
import DTEDetalle      from '../pages/DTEs/DTEDetalle';
import DTEEmitir       from '../pages/DTEs/DTEEmitir';
import Configuracion   from '../pages/Configuracion';
import Establecimientos from '../pages/Establecimientos';
import Usuarios        from '../pages/Usuarios';
import Clientes        from '../pages/Clientes';
import Contingencia    from '../pages/Contingencia';
import Auditoria       from '../pages/Auditoria';
import NotFound        from '../pages/NotFound';

const router = createBrowserRouter([
  // ── Rutas públicas ──
  {
    path:    '/login',
    element: <Login />,
  },

  // ── Rutas protegidas — requieren JWT válido ──
  {
    path:    '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      // Redirigir raíz al dashboard
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Dashboard
      { path: 'dashboard', element: <Dashboard /> },

      // DTEs — cualquier usuario autenticado
      { path: 'dtes',          element: <DTEListado /> },
      { path: 'dtes/emitir',   element: <DTEEmitir /> },
      { path: 'dtes/:codigo',  element: <DTEDetalle /> },

      // Contingencia
      { path: 'contingencia', element: <Contingencia /> },

      // ── Solo administrador ──
      {
        path:    'configuracion',
        element: <AdminRoute><Configuracion /></AdminRoute>,
      },
      {
        path:    'establecimientos',
        element: <AdminRoute><Establecimientos /></AdminRoute>,
      },
      {
        path:    'usuarios',
        element: <AdminRoute><Usuarios /></AdminRoute>,
      },
      {
        path:    'clientes',
        element: <Clientes />,
      },
      {
        path:    'auditoria',
        element: <AdminRoute><Auditoria /></AdminRoute>,
      },
    ],
  },

  // 404
  { path: '*', element: <NotFound /> },
]);

export default router;
