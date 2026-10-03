// src/components/ui/MaskedInput.jsx
// Input con máscara de formato implícita (NIT/NRC/teléfono).
// Mantiene el valor formateado en el estado del formulario (react-hook-form);
// al guardar se normaliza a dígitos (ver utils/mascaras.js).

import { Input } from './input';
import { aplicarMascara } from '../../utils/mascaras';

const MaskedInput = ({ mask = 'nit', register, ...rest }) => {
  const { onChange: onChangeRHF, ...registerRest } = register || {};

  return (
    <Input
      {...registerRest}
      {...rest}
      onChange={(e) => {
        e.target.value = aplicarMascara(mask, e.target.value);
        onChangeRHF?.(e);
      }}
    />
  );
};

export default MaskedInput;