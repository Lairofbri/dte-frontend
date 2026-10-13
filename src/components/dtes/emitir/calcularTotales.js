// src/components/dtes/emitir/calcularTotales.js
// Fórmulas compartidas por el wizard de emisión:
//   - calcularTotales: cálculo de totales Hacienda (FCF/CCF/FSE/NC/ND)
//   - numeroALetras: total en letras para el resumen del DTE

import { calcularTotales } from '../../../hooks/useEmitirDTE';

// ─────────────────────────────────────────────
// NÚMERO A LETRAS (simplificado frontend)
// ─────────────────────────────────────────────
const numeroALetras = (monto) => {
  if (isNaN(monto) || monto <= 0) return '';
  const entero   = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const u = ['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
    'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE'];
  const d = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const c = ['','CIEN','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
    'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  const v = ['','VEINTIÚN','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  const menorMil = (n) => {
    if (!n) return '';
    if (n===100) return 'CIEN';
    if (n<20) return u[n];
    if (n>=21&&n<=29) return v[n-20];
    if (n<100) { const dd=Math.floor(n/10),uu=n%10; return uu?`${d[dd]} Y ${u[uu]}`:d[dd]; }
    const cc=Math.floor(n/100),r=n%100;
    return r?(cc===1?`CIENTO ${menorMil(r)}`:`${c[cc]} ${menorMil(r)}`):c[cc];
  };
  const conv = (n) => {
    if (!n) return 'CERO';
    if (n<1000) return menorMil(n);
    const m=Math.floor(n/1000),r=n%1000;
    const p=m===1?'MIL':`${menorMil(m)} MIL`;
    return r?`${p} ${menorMil(r)}`:p;
  };
  return `${conv(entero)} ${centavos.toString().padStart(2,'0')}/100 DÓLARES`;
};

export { calcularTotales, numeroALetras };