// src/services/printingService.js
// Cliente del agente local de impresión (AmberPrint) para el DTE Frontend.
//
// El navegador no puede imprimir solo: el **backend genera los bytes ESC/POS**
// (`GET /api/dte/:codigo/ticket-escpos`) y el agente local los escribe en la
// impresora. Esta utilidad es el único punto de contacto con `127.0.0.1:9101`.
//
// No usa el axios del backend (ese apunta al dte-service y refresca el JWT): el
// agente responde en loopback, sin JWT y con errores tipados que la UI necesita
// distinguir. El token del agente es un **secreto local del equipo** (viaja solo
// a 127.0.0.1) y vive en `localStorage` — es por origen, así que se carga también
// en este frontend aunque ya esté configurado en el POS.

import { obtenerTicketEscposApi } from '../api/dtes.api';
const CLAVE_TOKEN = 'amberprint_token';
const CLAVE_PUERTO = 'amberprint_puerto';
const PUERTO_POR_DEFECTO = 9101;

/** Error de impresión con la causa clasificada (para mensajes y reintentos). */
export class ErrorImpresion extends Error {
  constructor(codigo, mensaje, reintentable = false) {
    super(mensaje);
    this.name = 'ErrorImpresion';
    this.codigo = codigo;
    this.reintentable = reintentable;
  }
}

export const esErrorImpresion = (err) => err instanceof ErrorImpresion;

// ── Configuración local (por equipo) ────────────────────────────────────────

export const obtenerPuerto = () => {
  const valor = Number(localStorage.getItem(CLAVE_PUERTO));
  return Number.isInteger(valor) && valor >= 1 && valor <= 65535 ? valor : PUERTO_POR_DEFECTO;
};

export const guardarPuerto = (puerto) => {
  localStorage.setItem(CLAVE_PUERTO, String(puerto));
};

export const obtenerToken = () => localStorage.getItem(CLAVE_TOKEN) ?? '';

export const guardarToken = (token) => {
  const limpio = String(token ?? '').trim();
  if (limpio) localStorage.setItem(CLAVE_TOKEN, limpio);
  else localStorage.removeItem(CLAVE_TOKEN);
};

export const agenteConfigurado = () => obtenerToken().length > 0;

const urlAgente = (ruta) => `http://127.0.0.1:${obtenerPuerto()}${ruta}`;

// ── Peticiones al agente ────────────────────────────────────────────────────

const CODIGOS_CONOCIDOS = [
  'ORIGEN_NO_PERMITIDO', 'TOKEN_REQUERIDO', 'TOKEN_INVALIDO', 'DESTINO_NO_PERMITIDO',
  'IMPRESORA_NO_ENCONTRADA', 'TIMEOUT', 'LIMITE_TASAS', 'PAYLOAD_MUY_GRANDE', 'ERROR_IMPRESION',
];

const normalizarCodigo = (codigo) =>
  CODIGOS_CONOCIDOS.includes(codigo) ? codigo : 'ERROR_AGENTE';

async function peticion(ruta, { method = 'GET', body, token, timeoutMs = 5000 } = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  let respuesta;
  try {
    respuesta = await fetch(urlAgente(ruta), {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controlador.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ErrorImpresion('TIMEOUT', 'El agente de impresión no respondió a tiempo.', true);
    }
    throw new ErrorImpresion(
      'AGENTE_AUSENTE',
      'No se pudo contactar al agente de impresión local (AmberPrint). Verificá que esté instalado y en ejecución.',
      true,
    );
  } finally {
    clearTimeout(temporizador);
  }

  let json = null;
  try {
    json = await respuesta.json();
  } catch {
    // Cuerpo no-JSON (p. ej. 204 de preflight): se conserva `null`.
  }

  if (!respuesta.ok || json?.ok === false) {
    const reintentable = json?.extra?.reintentable ?? respuesta.status >= 500;
    throw new ErrorImpresion(
      normalizarCodigo(json?.error?.codigo),
      json?.error?.mensaje ?? `El agente respondió con un error (HTTP ${respuesta.status}).`,
      reintentable,
    );
  }

  return json?.data ?? json;
}

/** `GET /health` (sin token). Devuelve `null` si el agente no está disponible. */
export async function detectarAgente(timeoutMs = 1500) {
  try {
    return await peticion('/health', { timeoutMs });
  } catch {
    return null;
  }
}

/** `GET /printers` — impresoras instaladas en Windows (requiere token). */
export const listarImpresorasAgente = () =>
  peticion('/printers', { token: obtenerToken(), timeoutMs: 4000 });

/** `GET /config` — preferencias persistidas del agente. */
export const obtenerConfigAgente = () =>
  peticion('/config', { token: obtenerToken(), timeoutMs: 4000 });

/** `PUT /config` — guarda preferencias (lo omitido no se toca). */
export const guardarConfigAgente = (cambios) =>
  peticion('/config', { method: 'PUT', body: cambios, token: obtenerToken(), timeoutMs: 4000 });

/** `POST /prueba` — ticket + QR de prueba local. */
export const probarImpresionAgente = (opciones = {}) =>
  peticion('/prueba', { method: 'POST', body: opciones, token: obtenerToken(), timeoutMs: 10000 });

// ── Impresión ───────────────────────────────────────────────────────────────

const aBase64 = (bytes) => {
  let binario = '';
  const trozo = 0x8000;
  for (let i = 0; i < bytes.length; i += trozo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + trozo));
  }
  return btoa(binario);
};

/** `POST /print` — envía el flujo ESC/POS al agente. */
export async function imprimirBytes(bytes, opciones = {}) {
  if (!agenteConfigurado()) {
    throw new ErrorImpresion('SIN_TOKEN', 'Falta configurar el token del agente de impresión (Configuración › Impresión).');
  }

  return peticion('/print', {
    method: 'POST',
    token: obtenerToken(),
    timeoutMs: 10000,
    body: {
      ...(opciones.impresora ? { impresora: opciones.impresora } : {}),
      ...(opciones.destino ? { destino: opciones.destino } : {}),
      escpos_base64: aBase64(bytes),
      ...(opciones.trabajo ? { trabajo: opciones.trabajo } : {}),
    },
  });
}

/**
 * Mensaje del backend cuando la petición falla con `responseType: 'arraybuffer'`
 * (el cuerpo del error llega como ArrayBuffer, no como objeto).
 */
const mensajeDelBackend = (data) => {
  try {
    if (!data) return null;
    if (typeof data === 'string') return JSON.parse(data).mensaje ?? null;
    if (data instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(new Uint8Array(data))).mensaje ?? null;
    return data.mensaje ?? null;
  } catch {
    return null;
  }
};

/**
 * Pide el comprobante fiscal al backend y lo envía al agente.
 * No crea ni modifica nada: reimprimir es idempotente respecto de la emisión.
 * Un DTE que no esté `aceptado` devuelve 409 desde el backend y no se imprime.
 */
export async function imprimirTicketDte(codigoGeneracion, opciones = {}) {
  let bytes;
  try {
    bytes = await obtenerTicketEscposApi(codigoGeneracion, {
      papelMm: opciones.papelMm,
      caracteresXLinea: opciones.caracteresXLinea,
    });
  } catch (err) {
    const mensaje = mensajeDelBackend(err?.response?.data) ?? 'No se pudo generar el comprobante en el servidor.';
    // Un 409 (DTE no aceptado) no se reintenta solo: la UI avisa y espera a Hacienda.
    throw new ErrorImpresion('ERROR_BACKEND', mensaje, err?.response?.status >= 500);
  }

  return imprimirBytes(bytes, {
    trabajo: `factura:${codigoGeneracion}`,
    ...(opciones.impresora ? { impresora: opciones.impresora } : {}),
    ...(opciones.destino ? { destino: opciones.destino } : {}),
  });
}
