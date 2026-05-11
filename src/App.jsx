// src/App.jsx
// Punto de entrada de la aplicación
// Configura providers globales y verifica sesión al cargar

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import router from './router';
import { refreshApi } from './api/auth.api';
import { meApi } from './api/auth.api';
import { useAuthStore } from './store/auth.store';

const App = () => {
  const { setAuth, logout, setLoading } = useAuthStore();

  // Al cargar la app intentar renovar la sesión con la cookie httpOnly
  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const resultado = await refreshApi();
        const usuario   = await meApi();
        setAuth({
          accessToken: resultado.access_token,
          usuario,
        });
      } catch (_) {
        // No hay sesión activa — el usuario debe hacer login
        logout();
      }
    };

    verificarSesion();
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontSize:  '14px',
            maxWidth:  '400px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
          },
        }}
      />
    </>
  );
};

export default App;
