// src/App.jsx
// Punto de entrada de la aplicación
// Verifica sesión al cargar usando la cookie httpOnly

import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import router from './router';
import { refreshApi, meApi } from './api/auth.api';
import { useAuthStore } from './store/auth.store';

let restauracionEnCurso = null;

const restaurarSesion = async ({ refresh, setAccessToken, setAuth, logout, setLoading }) => {
  try {
    const resultado = await refresh();
    setAccessToken(resultado.access_token);

    const usuario = await meApi();
    setAuth({
      accessToken: resultado.access_token,
      usuario,
    });
  } catch {
    logout();
  } finally {
    setLoading(false);
  }
};

const App = () => {
  const { setAuth, logout, setAccessToken, setLoading } = useAuthStore();

  useEffect(() => {
    if (!restauracionEnCurso) {
      restauracionEnCurso = restaurarSesion({
        refresh: refreshApi,
        setAccessToken,
        setAuth,
        logout,
        setLoading,
      }).finally(() => {
        restauracionEnCurso = null;
      });
    }
  }, [logout, setAccessToken, setAuth, setLoading]);

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
