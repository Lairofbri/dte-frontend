// src/router/AdminRoute.jsx
// Solo accesible para usuarios con rol administrador o plataforma
// (el rol plataforma administra el onboarding de empresas — Fase 2/6)

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const AdminRoute = ({ children }) => {
  const usuario = useAuthStore((s) => s.usuario);

  if (usuario?.rol !== 'administrador' && usuario?.rol !== 'plataforma') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
