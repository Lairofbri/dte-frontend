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
import Impresion       from '../pages/Impresion';
import Establecimientos from '../pages/Establecimientos';
import SeleccionarSucursal from '../pages/SeleccionarSucursal';
import Usuarios        from '../pages/Usuarios';
import Onboarding      from '../pages/Onboarding';
import Clientes        from '../pages/Clientes';
import Productos       from '../pages/Productos';
import Contingencia    from '../pages/Contingencia';
import Auditoria       from '../pages/Auditoria';
import NotFound        from '../pages/NotFound';

const router = createBrowserRouter([
  // ── Rutas públicas ──
  {
    path:    '/login',
    element: <Login />,
  },

  // ── Fase C3 — selector de sucursal post-login (solo administrador) ──
  {
    path:    '/seleccionar-sucursal',
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <SeleccionarSucursal />
        </AdminRoute>
      </ProtectedRoute>
    ),
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
        path:    'impresion',
        element: <AdminRoute><Impresion /></AdminRoute>,
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
        // Mantenimiento "Crear empresa": SOLO rol plataforma (2026-10-07).
        path:    'onboarding',
        element: <AdminRoute permitir={['plataforma']}><Onboarding /></AdminRoute>,
      },
      {
        path:    'clientes',
        element: <Clientes />,
      },
      {
        path:    'productos',
        element: <Productos />,
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
