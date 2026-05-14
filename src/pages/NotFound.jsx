// src/pages/NotFound.jsx
import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-6">
          <FileQuestion className="w-8 h-8 text-gray-400" aria-hidden="true" />
        </div>
        <h1 className="text-6xl font-bold font-sans text-gray-200 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Página no encontrada</h2>
        <p className="text-sm text-gray-400 mb-6">
          La ruta que buscas no existe o fue movida.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => navigate(-1)}>Volver</Button>
          <Button onClick={() => navigate('/dashboard')}>Ir al dashboard</Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
