// src/router/AdminRoute.jsx
// Accesible solo para usuarios con alguno de los roles permitidos.
// Multi-rol (2026-10-16): un usuario puede tener varios roles; basta con que
// uno de ellos esté en `permitir`.
// Prop `permitir` para restringir: por defecto administrador o plataforma;
// { permitir: ['plataforma'] } para mantenimiento exclusivo de plataforma
// (ej: /onboarding — "Crear empresa", decisión 2026-10-07).

import { Navigate } from 'react-router-dom';
import { useAuthStore, obtenerRoles } from '../store/auth.store';

const AdminRoute = ({ children, permitir = ['administrador', 'plataforma'] }) => {
  const usuario = useAuthStore((s) => s.usuario);

  const autorizado = obtenerRoles(usuario).some((rol) => permitir.includes(rol));

  if (!autorizado) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
