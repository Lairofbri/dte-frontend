// src/components/dtes/ModalAnulacion.jsx
// Modal para confirmar la anulación de un DTE
// passwordPri NUNCA se guarda en estado persistente — solo local en el modal

import { useState, useId } from 'react';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Modal  from '../ui/Modal';
import Button from '../ui/Button';

const MOTIVOS = [
  { value: '',  label: 'Selecciona un motivo' },
  { value: '1', label: 'Error en los datos del receptor' },
  { value: '2', label: 'Error en los montos o cantidades' },
  { value: '3', label: 'Operación no realizada' },
  { value: '4', label: 'Duplicado por error del sistema' },
  { value: '5', label: 'Otro motivo' },
];

const ModalAnulacion = ({ isOpen, onClose, onConfirmar, anulando, numeroDTE }) => {
  // passwordPri en estado local — se limpia al cerrar el modal
  const [passwordPri,      setPasswordPri]      = useState('');
  const [motivoAnulacion,  setMotivoAnulacion]  = useState('');
  const [showPassword,     setShowPassword]     = useState(false);
  const [errores,          setErrores]          = useState({});

  const passwordId = useId();
  const motivoId   = useId();

  const limpiarYCerrar = () => {
    // Limpiar passwordPri del estado al cerrar — NUNCA persiste
    setPasswordPri('');
    setMotivoAnulacion('');
    setShowPassword(false);
    setErrores({});
    onClose();
  };

  const validar = () => {
    const nuevosErrores = {};
    if (!motivoAnulacion) {
      nuevosErrores.motivo = 'Selecciona un motivo de anulación.';
    }
    if (!passwordPri.trim()) {
      nuevosErrores.password = 'La contraseña de firma es requerida.';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleConfirmar = async () => {
    if (!validar()) return;

    await onConfirmar({ passwordPri, motivoAnulacion });
    // Limpiar aunque se cierre por éxito
    setPasswordPri('');
    setMotivoAnulacion('');
    setShowPassword(false);
    setErrores({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={limpiarYCerrar}
      title="Anular DTE"
      size="sm"
    >
      {/* Advertencia */}
      <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-5">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-red-700">Esta acción es irreversible</p>
          <p className="text-xs text-red-600 mt-0.5">
            El DTE <span className="font-mono font-medium">{numeroDTE}</span> será
            anulado ante el Ministerio de Hacienda.
          </p>
        </div>
      </div>

      {/* Motivo */}
      <div className="mb-4">
        <label htmlFor={motivoId} className="label">
          Motivo de anulación <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <select
          id={motivoId}
          value={motivoAnulacion}
          onChange={(e) => setMotivoAnulacion(e.target.value)}
          aria-invalid={!!errores.motivo}
          aria-describedby={errores.motivo ? `${motivoId}-error` : undefined}
          className={`input ${errores.motivo ? 'input-error' : ''}`}
        >
          {MOTIVOS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {errores.motivo && (
          <p id={`${motivoId}-error`} className="error-msg" role="alert">
            {errores.motivo}
          </p>
        )}
      </div>

      {/* Password de firma */}
      <div className="mb-6">
        <label htmlFor={passwordId} className="label">
          Contraseña de firma (passwordPri){' '}
          <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <input
            id={passwordId}
            type={showPassword ? 'text' : 'password'}
            value={passwordPri}
            onChange={(e) => setPasswordPri(e.target.value)}
            aria-invalid={!!errores.password}
            aria-describedby={errores.password ? `${passwordId}-error` : undefined}
            placeholder="Contraseña del certificado"
            className={`input pr-10 ${errores.password ? 'input-error' : ''}`}
            autoComplete="off"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword
              ? <EyeOff className="w-4 h-4" aria-hidden="true" />
              : <Eye    className="w-4 h-4" aria-hidden="true" />
            }
          </button>
        </div>
        {errores.password && (
          <p id={`${passwordId}-error`} className="error-msg" role="alert">
            {errores.password}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="secondary"
          onClick={limpiarYCerrar}
          disabled={anulando}
        >
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirmar}
          isLoading={anulando}
        >
          Confirmar anulación
        </Button>
      </div>
    </Modal>
  );
};

export default ModalAnulacion;
