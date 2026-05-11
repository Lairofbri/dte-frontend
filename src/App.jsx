// src/App.jsx
// Punto de entrada de la aplicación
// Verifica sesión al cargar usando la cookie httpOnly

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import router from './router';
import { refreshApi, meApi } from './api/auth.api';
import { useAuthStore } from './store/auth.store';

const App = () => {
  const { setAuth, logout, setLoading, setAccessToken } = useAuthStore();

  useEffect(() => {
    const verificarSesion = async () => {
      try {
        // 1. Renovar access token con cookie httpOnly
        const resultado = await refreshApi();

        // 2. Guardar token ANTES de llamar meApi()
        //    Fix CUBIC: el interceptor necesita el token en el store
        setAccessToken(resultado.access_token);

        // 3. Obtener datos del usuario
        const usuario = await meApi();

        // 4. Guardar todo en el store
        setAuth({
          accessToken: resultado.access_token,
          usuario,
        });
      } catch (_) {
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
            fontSize:   '14px',
            maxWidth:   '400px',
            fontFamily: 'Inter, sans-serif',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
    </>
  );
};

export default App;
