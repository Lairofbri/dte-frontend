// src/router/AdminRoute.jsx
// Solo accesible para usuarios con rol administrador o plataforma.
// Prop `permitir` para restringir más: { permitir: ['administrador'] } o
// { permitir: ['plataforma'] } (ej: /onboarding — mantenimiento "Crear
// empresa" reservado al rol plataforma, decisión 2026-10-07).

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const AdminRoute = ({ children, permitir = ['administrador', 'plataforma'] }) => {
  const usuario = useAuthStore((s) => s.usuario);

  if (!permitir.includes(usuario?.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;