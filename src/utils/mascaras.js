// src/utils/mascaras.js
// Máscaras de formato para campos fiscales (El Salvador).
// El formato (guiones) es SOLO presentación: al guardar se envían dígitos
// (Hacienda recibe NIT/NRC sin guiones en el JSON del DTE).

const soloDigitos = (valor) => (valor || '').replace(/\D/g, '');

const aplicarMascaraNIT = (valor) => {
  const d = soloDigitos(valor).slice(0, 14);
  if (d.length <= 4) return d;
  if (d.length <= 10) return `${d.slice(0, 4)}-${d.slice(4)}`;
  if (d.length <= 13) return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 10)}-${d.slice(10, 13)}-${d.slice(13)}`;
};

const aplicarMascaraNRC = (valor) => {
  const d = soloDigitos(valor).slice(0, 8);
  if (d.length <= 6) return d;
  return `${d.slice(0, 6)}-${d.slice(6)}`;
};

const aplicarMascaraTelefono = (valor) => {
  let d = soloDigitos(valor);
  if (d.startsWith('503') && d.length > 8) d = d.slice(3);
  d = d.slice(0, 8);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
};

/**
 * Aplica la máscara según el tipo de campo.
 * @param {'nit'|'nrc'|'telefono'} tipo
 */
const aplicarMascara = (tipo, valor) => {
  if (tipo === 'nit') return aplicarMascaraNIT(valor);
  if (tipo === 'nrc') return aplicarMascaraNRC(valor);
  if (tipo === 'telefono') return aplicarMascaraTelefono(valor);
  return valor;
};

/**
 * Elimina guiones y espacios (formato de presentación) para almacenar
 * y enviar solo dígitos.
 */
const limpiarFormato = (valor) => (valor || '').replace(/[-\s]/g, '');

export { aplicarMascara, limpiarFormato, soloDigitos };