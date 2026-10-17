// src/pages/Impresion.jsx
// Configuración de impresión térmica del DTE Frontend (agente local AmberPrint).
//
// El agente vive en el equipo del usuario (127.0.0.1) y escribe los bytes ESC/POS
// que genera el backend (`GET /api/dte/:codigo/ticket-escpos`). Acá se configura
// el token del equipo, la impresora, el ancho, el corte, la auto-impresión y se
// ejecutan las pruebas. Nada de esto afecta a la emisión de DTEs.

import { useCallback, useEffect, useState } from 'react';
import {
  Server, RefreshCw, Usb, Network, KeyRound, FlaskConical, QrCode, CheckCircle2, Printer,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  detectarAgente, obtenerConfigAgente, guardarConfigAgente, listarImpresorasAgente,
  probarImpresionAgente, imprimirTicketDte, obtenerToken, guardarToken, obtenerPuerto, guardarPuerto,
  agenteConfigurado, esErrorImpresion,
} from '../services/printingService';
import Input               from '../components/ui/Input';
import Button              from '../components/ui/Button';
import Spinner             from '../components/ui/Spinner';
import { BadgeGenerico }   from '../components/ui/Badge';

/** URL de demostración para la prueba del QR (consulta pública de Hacienda). */
const QR_DEMO =
  'https://admin.factura.gob.sv/consultaPublica?ambiente=01&codGen=00000000-0000-4000-8000-000000000000&fechaEmi=2026-01-01';

const mensajeDe = (err) =>
  esErrorImpresion(err) ? err.message : 'Ocurrió un error inesperado al hablar con el agente.';

/** Normaliza un origen a `scheme://host[:puerto]` (lo que el agente compara). */
const normalizarOrigen = (valor) => {
  const limpio = String(valor ?? '').trim();
  if (!limpio) return null;
  try {
    const url = new URL(limpio);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
};

const Impresion = () => {
  const [detectando, setDetectando] = useState(false);
  const [estado, setEstado] = useState(null);
  const [config, setConfig] = useState(null);
  const [listado, setListado] = useState(null);
  const [form, setForm] = useState(null);
  const [origenes, setOrigenes] = useState([]);
  const [nuevoOrigen, setNuevoOrigen] = useState('');
  const [tokenInput, setTokenInput] = useState(() => obtenerToken());
  const [puertoInput, setPuertoInput] = useState(() => String(obtenerPuerto()));
  const [guardando, setGuardando] = useState(false);
  const [guardandoOrigenes, setGuardandoOrigenes] = useState(false);
  const [probando, setProbando] = useState(null);
  const [error, setError] = useState(null);

  const conectar = useCallback(async () => {
    setDetectando(true);
    setError(null);
    const agente = await detectarAgente();
    setEstado(agente);

    if (agente && agenteConfigurado()) {
      try {
        const [cfg, impresoras] = await Promise.all([obtenerConfigAgente(), listarImpresorasAgente()]);
        setConfig(cfg);
        setListado(impresoras);
        setOrigenes(cfg.origenesPermitidos ?? []);
        setForm({
          impresoraPorDefecto: cfg.impresion.impresoraPorDefecto ?? '',
          tipoPorDefecto: cfg.impresion.tipoPorDefecto === 'red' ? 'red' : 'usb',
          ipPorDefecto: cfg.impresion.ipPorDefecto ?? '',
          puertoPorDefecto: cfg.impresion.puertoPorDefecto,
          papelMm: cfg.impresion.papelMm === 58 ? 58 : 80,
          corte: cfg.impresion.corte,
          autoImpresion: cfg.impresion.autoImpresion,
        });
      } catch (err) {
        setConfig(null);
        setListado(null);
        setForm(null);
        setOrigenes([]);
        setError(mensajeDe(err));
      }
    } else {
      setConfig(null);
      setListado(null);
      setForm(null);
      setOrigenes([]);
    }
    setDetectando(false);
  }, []);

  useEffect(() => {
    const temporizador = setTimeout(() => void conectar(), 0);
    return () => clearTimeout(temporizador);
  }, [conectar]);

  const set = (clave, valor) => setForm((prev) => (prev ? { ...prev, [clave]: valor } : prev));

  const guardarConexion = async () => {
    guardarToken(tokenInput);
    const puerto = Number(puertoInput);
    guardarPuerto(Number.isInteger(puerto) && puerto >= 1 && puerto <= 65535 ? puerto : 9101);
    await conectar();
  };

  const guardarPreferencias = async () => {
    if (!form) return;
    setGuardando(true);
    setError(null);
    try {
      const cambios = {
        tipoPorDefecto: form.tipoPorDefecto,
        papelMm: form.papelMm,
        corte: form.corte,
        autoImpresion: form.autoImpresion,
      };
      if (form.tipoPorDefecto === 'usb') {
        // Cadena vacía = limpiar en el agente (null significa "no tocar").
        cambios.impresoraPorDefecto = form.impresoraPorDefecto;
      } else {
        cambios.ipPorDefecto = form.ipPorDefecto;
        cambios.puertoPorDefecto = form.puertoPorDefecto >= 1 && form.puertoPorDefecto <= 65535
          ? form.puertoPorDefecto
          : 9100;
      }

      const actualizada = await guardarConfigAgente(cambios);
      setConfig(actualizada);
      toast.success('Preferencias de impresión guardadas.');
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setGuardando(false);
    }
  };

  const agregarOrigen = () => {
    const limpio = normalizarOrigen(nuevoOrigen);
    if (!limpio) {
      setError('Ingresá un origen válido, por ejemplo https://dte.sandalfol.com (con http o https).');
      return;
    }
    setError(null);
    setOrigenes((prev) => (prev.some((o) => normalizarOrigen(o) === limpio) ? prev : [...prev, limpio]));
    setNuevoOrigen('');
  };

  const quitarOrigen = (origen) => setOrigenes((prev) => prev.filter((o) => o !== origen));

  const guardarOrigenes = async () => {
    setGuardandoOrigenes(true);
    setError(null);
    try {
      const actualizada = await guardarConfigAgente({ origenesPermitidos: origenes });
      setConfig(actualizada);
      setOrigenes(actualizada.origenesPermitidos ?? []);
      toast.success('Orígenes autorizados guardados.');
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setGuardandoOrigenes(false);
    }
  };

  const probar = async (modo) => {
    setProbando(modo);
    setError(null);
    try {
      const destino = form
        ? {
            tipo: form.tipoPorDefecto,
            ip: form.ipPorDefecto || undefined,
            puerto: form.puertoPorDefecto,
            impresora: form.impresoraPorDefecto || undefined,
          }
        : undefined;
      const resultado = await probarImpresionAgente({
        ...(destino ? { destino } : {}),
        ...(modo === 'qr' ? { qr: QR_DEMO, mensaje: 'Prueba de codigo QR' } : { mensaje: 'Ticket de prueba desde el DTE Frontend' }),
      });
      toast.success(`Enviado a ${resultado.destino} (${resultado.bytes} bytes). ${resultado.aviso}`);
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setProbando(null);
    }
  };

  /** Imprime de verdad un DTE ya emitido (prueba del circuito completo). */
  const probarDteReal = async () => {
    const codigo = window.prompt('Código de generación del DTE a imprimir (debe estar aceptado):');
    if (!codigo) return;
    setProbando('dte');
    setError(null);
    try {
      const resultado = await imprimirTicketDte(codigo.trim(), { papelMm: form?.papelMm });
      toast.success(`Comprobante enviado (${resultado.bytes} bytes). ${resultado.aviso}`);
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setProbando(null);
    }
  };

  const conectado = Boolean(estado);
  const sinImpresora = form?.tipoPorDefecto === 'usb' && !form?.impresoraPorDefecto;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Impresión</h1>
          <p className="page-subtitle">
            Impresión térmica directa en el equipo donde usás el DTE Frontend (sin diálogo del navegador).
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <BadgeGenerico variant={conectado ? 'green' : 'red'}>
            {detectando ? 'Detectando…' : conectado ? 'Agente conectado' : 'Sin respuesta'}
          </BadgeGenerico>
          <button
            onClick={() => void conectar()}
            disabled={detectando}
            className="text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-40"
            title="Volver a detectar"
            aria-label="Volver a detectar el agente"
          >
            <RefreshCw className={`w-4 h-4 ${detectando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {conectado && estado && (
        <div className="card p-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-mono">
          <span className="font-sans font-semibold text-gray-700">AmberPrint</span>
          <span>v{estado.version}</span>
          <span>puerto {estado.puerto}</span>
          <span>papel {estado.papelMm} mm</span>
          <span>corte {estado.corte ? 'on' : 'off'}</span>
          {estado.impresoraPorDefecto && <span>por defecto: {estado.impresoraPorDefecto}</span>}
        </div>
      )}

      {!conectado && !detectando && (
        <div className="card p-5 text-sm text-gray-600">
          <p className="flex items-center gap-2 font-medium text-gray-800 mb-1">
            <Server className="w-4 h-4" aria-hidden="true" />
            El agente local no responde
          </p>
          <p>
            Instalá <span className="font-mono">AmberPrint</span> en este equipo (doble clic en
            {' '}<span className="font-mono">instalar.cmd</span>) y pegá abajo el token que muestra el instalador.
            Sin agente, el DTE se emite igual: solo no se imprime solo.
          </p>
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-800 font-sans">Conexión con el agente</h2>
        </div>
        <div className="card-body flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
            <Input
              id="agente-token"
              label="Token del agente"
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Pegá el token del instalador"
              autoComplete="off"
            />
            <Input
              id="agente-puerto"
              label="Puerto"
              type="number"
              min={1}
              max={65535}
              value={puertoInput}
              onChange={(e) => setPuertoInput(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="secondary" onClick={() => void guardarConexion()} isLoading={detectando}>
              <KeyRound className="w-4 h-4" aria-hidden="true" />
              Guardar y conectar
            </Button>
            {config?.tokenConfigurado && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Token configurado en el agente
              </span>
            )}
          </div>
        </div>
      </section>

      {config && form && listado && (
        <section className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Preferencias de impresión</h2>
          </div>
          <div className="card-body flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => set('tipoPorDefecto', 'usb')}
                className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-colors ${form.tipoPorDefecto === 'usb' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-primary-300'}`}
              >
                <Usb className="w-4 h-4" aria-hidden="true" /> USB (impresora de Windows)
              </button>
              <button
                type="button"
                onClick={() => set('tipoPorDefecto', 'red')}
                className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-colors ${form.tipoPorDefecto === 'red' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-primary-300'}`}
              >
                <Network className="w-4 h-4" aria-hidden="true" /> Ethernet (IP)
              </button>
            </div>

            {form.tipoPorDefecto === 'usb' ? (
              <div>
                <label htmlFor="agente-impresora" className="label">Impresora por defecto</label>
                <select
                  id="agente-impresora"
                  className="input"
                  value={form.impresoraPorDefecto}
                  onChange={(e) => set('impresoraPorDefecto', e.target.value)}
                >
                  <option value="">
                    {listado.impresoras.length ? 'Seleccionar impresora' : 'No hay impresoras instaladas'}
                  </option>
                  {listado.impresoras.map((i) => (
                    <option key={i.nombre} value={i.nombre}>
                      {i.predeterminada ? `${i.nombre} (predeterminada)` : i.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                <Input
                  id="agente-ip"
                  label="IP de la impresora"
                  value={form.ipPorDefecto}
                  onChange={(e) => set('ipPorDefecto', e.target.value)}
                  placeholder="192.168.1.100"
                />
                <Input
                  id="agente-puerto-impresora"
                  label="Puerto"
                  type="number"
                  value={String(form.puertoPorDefecto)}
                  onChange={(e) => set('puertoPorDefecto', Number(e.target.value))}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="label">Ancho de papel</p>
                <div className="flex items-center gap-2">
                  {[80, 58].map((mm) => (
                    <button
                      key={mm}
                      type="button"
                      onClick={() => set('papelMm', mm)}
                      className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${form.papelMm === mm ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-primary-300'}`}
                    >
                      {mm} mm
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3">
                <label className="flex items-center justify-between gap-3 text-sm text-gray-700 cursor-pointer">
                  Corte de papel al terminar
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary-600"
                    checked={form.corte}
                    onChange={(e) => set('corte', e.target.checked)}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm text-gray-700 cursor-pointer">
                  Auto-imprimir el comprobante al emitir
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary-600"
                    checked={form.autoImpresion}
                    onChange={(e) => set('autoImpresion', e.target.checked)}
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="secondary" onClick={() => void guardarPreferencias()} isLoading={guardando}>
                Guardar preferencias
              </Button>
              <Button
                variant="secondary"
                onClick={() => void probar('ticket')}
                isLoading={probando === 'ticket'}
                disabled={sinImpresora}
              >
                <FlaskConical className="w-4 h-4" aria-hidden="true" />
                Ticket de prueba
              </Button>
              <Button
                variant="secondary"
                onClick={() => void probar('qr')}
                isLoading={probando === 'qr'}
                disabled={sinImpresora}
              >
                <QrCode className="w-4 h-4" aria-hidden="true" />
                Prueba del QR
              </Button>
              <Button
                variant="secondary"
                onClick={() => void probarDteReal()}
                isLoading={probando === 'dte'}
                disabled={sinImpresora}
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                Imprimir un DTE real
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              El agente confirma «enviado», no «impreso»: si el papel no sale, revisá la cola de impresión de Windows.
            </p>
          </div>
        </section>
      )}

      {config && form && (
        <section className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-800 font-sans">Orígenes autorizados a imprimir</h2>
          </div>
          <div className="card-body flex flex-col gap-3">
            <p className="text-xs text-gray-500">
              Solo estas páginas pueden enviar trabajos al agente. La comparación es <b>exacta</b>:
              {' '}<span className="font-mono">https://dte.sandalfol.com</span> y
              {' '}<span className="font-mono">https://pos.sandalfol.com</span> son orígenes distintos.
              Si quitás el origen desde el que estás usando esta página, dejará de poder imprimir.
            </p>

            {origenes.length === 0 ? (
              <p className="text-xs text-red-600" role="alert">
                La lista está vacía: ninguna página podrá imprimir hasta que agregues al menos este origen.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {origenes.map((origen) => (
                  <li
                    key={origen}
                    className="flex items-center gap-2 font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
                  >
                    <span className="truncate flex-1">{origen}</span>
                    {normalizarOrigen(window.location.origin) === origen && (
                      <span className="text-[10px] font-sans font-semibold text-green-600 shrink-0">actual</span>
                    )}
                    <button
                      type="button"
                      onClick={() => quitarOrigen(origen)}
                      className="text-gray-400 hover:text-red-600 transition-colors shrink-0"
                      title="Quitar origen"
                      aria-label={`Quitar el origen ${origen}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <Input
                  id="agente-origen"
                  label="Agregar origen"
                  value={nuevoOrigen}
                  onChange={(e) => setNuevoOrigen(e.target.value)}
                  placeholder="https://dte.sandalfol.com"
                  autoComplete="off"
                />
              </div>
              <Button variant="secondary" onClick={agregarOrigen} disabled={!nuevoOrigen.trim()}>
                Agregar
              </Button>
              <Button variant="secondary" onClick={() => void guardarOrigenes()} isLoading={guardandoOrigenes}>
                Guardar orígenes
              </Button>
            </div>
          </div>
        </section>
      )}

      {detectando && (
        <div className="flex justify-center py-2">
          <Spinner />
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default Impresion;
