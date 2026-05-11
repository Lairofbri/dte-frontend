// src/components/layout/Header.jsx
// Header superior con menú de usuario y botón de logout

import { Menu, LogOut, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { logoutApi } from '../../api/auth.api';

const Header = ({ onMenuClick, titulo }) => {
  const navigate   = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (_) {
      // Si falla el API igual hacemos logout local
    } finally {
      logout();
      navigate('/login');
      toast.success('Sesión cerrada correctamente.');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Lado izquierdo — botón menú móvil + título */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menú de navegación"
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        {titulo && (
          <h2 className="text-lg font-semibold font-sans text-gray-900 hidden sm:block">
            {titulo}
          </h2>
        )}
      </div>

      {/* Lado derecho — notificaciones y logout */}
      <div className="flex items-center gap-2">
        <button
          aria-label="Notificaciones"
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative"
        >
          <Bell className="w-5 h-5" />
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
