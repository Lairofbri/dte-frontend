// src/router/AdminRoute.jsx
// Solo accesible para usuarios con rol administrador

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

const AdminRoute = ({ children }) => {
  const usuario = useAuthStore((s) => s.usuario);

  if (usuario?.rol !== 'administrador') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
