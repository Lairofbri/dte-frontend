// src/components/clientes/SelectorCliente.jsx
// Autocomplete de clientes para DTEEmitir
// Debounce 350ms + race condition guard
// Al seleccionar → llena todos los campos del receptor

import { useState, useEffect, useRef, useId, useCallback } from 'react';
import { Search, X, Plus, User, Building2, Loader2 } from 'lucide-react';
import { buscarClientesApi } from '../../api/clientes.api';
import ModalCliente from './ModalCliente';
import { crearClienteApi } from '../../api/clientes.api';
import { toast } from 'react-hot-toast';

// Tipo de cliente sugerido según tipoDte activo
const getTipoSugerido = (tipoDte) => {
  if (tipoDte === '03') return 'juridico'; // CCF → jurídico
  if (tipoDte === '14') return 'juridico'; // FSE → jurídico
  return '';                               // FCF → cualquiera
};

const SelectorCliente = ({ tipoDte, onSeleccionar, valorActual = '' }) => {
  const inputId    = useId();
  const listboxId  = useId();
  const [busqueda,      setBusqueda]      = useState(valorActual);
  const [resultados,    setResultados]    = useState([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [abierto,       setAbierto]       = useState(false);
  const [clienteSelec,  setClienteSelec]  = useState(null);
  const [modalNuevo,    setModalNuevo]    = useState(false);
  const [activoIdx,     setActivoIdx]     = useState(-1);
  const wrapperRef = useRef(null);

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Búsqueda con debounce + race condition guard
  useEffect(() => {
    if (clienteSelec) return; // Ya seleccionado — no buscar
    if (!busqueda.trim()) {
      setResultados([]);
      setAbierto(false);
      return;
    }

    let cancelado = false;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const params = { q: busqueda.trim(), limite: 8 };
        const tipo = getTipoSugerido(tipoDte);
        if (tipo) params.tipo_cliente = tipo;
        const datos = await buscarClientesApi(params);
        if (!cancelado) {
          setResultados(datos?.clientes ?? []);
          setAbierto(true);
          setActivoIdx(-1);
        }
      } catch (_) {
        if (!cancelado) setResultados([]);
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    }, 350);

    return () => { cancelado = true; clearTimeout(timer); };
  }, [busqueda, tipoDte, clienteSelec]);

  const seleccionar = useCallback((cliente) => {
    setClienteSelec(cliente);
    setBusqueda(cliente.nombre);
    setAbierto(false);
    setActivoIdx(-1);
    // Construir receptor según tipo de DTE
    let receptor = null;
    if (tipoDte === '01') {
      receptor = {
        nombre:        cliente.nombre,
        tipo_documento: cliente.tipo_documento || null,
        num_documento:  cliente.num_documento  || null,
        correo:        cliente.correo          || null,
        telefono:      cliente.telefono        || null,
      };
    } else if (tipoDte === '03') {
      receptor = {
        nit:            cliente.nit,
        nrc:            cliente.nrc            || null,
        nombre:         cliente.nombre,
        cod_actividad:  cliente.cod_actividad  || null,
        desc_actividad: cliente.desc_actividad || null,
        correo:         cliente.correo         || null,
        telefono:       cliente.telefono       || null,
        departamento_cod: cliente.departamento_cod || null,
        municipio_cod:  cliente.municipio_cod  || null,
        direccion:      cliente.direccion      || null,
      };
    } else if (tipoDte === '14') {
      receptor = {
        nit:      cliente.nit,
        nombre:   cliente.nombre,
        correo:   cliente.correo   || null,
        telefono: cliente.telefono || null,
      };
    }
    onSeleccionar(receptor, cliente.id);
  }, [tipoDte, onSeleccionar]);

  const limpiar = () => {
    setClienteSelec(null);
    setBusqueda('');
    setResultados([]);
    setAbierto(false);
    onSeleccionar(null, null);
  };

  // Navegación con teclado
  const onKeyDown = (e) => {
    if (!abierto || resultados.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivoIdx(p => Math.min(p + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivoIdx(p => Math.max(p - 1, 0));
    } else if (e.key === 'Enter' && activoIdx >= 0) {
      e.preventDefault();
      seleccionar(resultados[activoIdx]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  // Crear cliente desde el selector
  const onCrearCliente = async (datos) => {
    const nuevo = await crearClienteApi(datos);
    toast.success('Cliente creado y seleccionado.');
    seleccionar(nuevo);
    setModalNuevo(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          aria-hidden="true" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activoIdx >= 0 ? `${listboxId}-${activoIdx}` : undefined}
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            if (clienteSelec) setClienteSelec(null);
          }}
          onFocus={() => { if (resultados.length > 0) setAbierto(true); }}
          onKeyDown={onKeyDown}
          placeholder={
            tipoDte === '03' ? 'Buscar empresa (NIT, NRC, nombre)...' :
            tipoDte === '14' ? 'Buscar sujeto excluido (NIT, nombre)...' :
            'Buscar cliente (nombre, DUI, NIT)...'
          }
          className={`input pl-9 pr-16 ${clienteSelec ? 'bg-green-50 border-green-300' : ''}`}
          autoComplete="off"
        />

        {/* Indicadores derecha */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" aria-hidden="true" />
          )}
          {clienteSelec && (
            <button type="button" onClick={limpiar}
              aria-label="Quitar cliente seleccionado"
              className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Chip del seleccionado */}
      {clienteSelec && (
        <div className="mt-1.5 flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
          {clienteSelec.tipo_cliente === 'juridico'
            ? <Building2 className="w-3.5 h-3.5 text-green-600 shrink-0" aria-hidden="true" />
            : <User      className="w-3.5 h-3.5 text-green-600 shrink-0" aria-hidden="true" />
          }
          <span className="text-xs text-green-700 font-medium">{clienteSelec.nombre}</span>
          {clienteSelec.nit && (
            <span className="text-xs text-green-500 font-mono">NIT: {clienteSelec.nit}</span>
          )}
          {clienteSelec.num_documento && (
            <span className="text-xs text-green-500 font-mono">{clienteSelec.num_documento}</span>
          )}
        </div>
      )}

      {/* Dropdown */}
      {abierto && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Resultados de búsqueda de clientes"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">

          {resultados.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400 text-center">
              Sin resultados — ¿deseas crear este cliente?
            </li>
          ) : (
            resultados.map((cliente, idx) => (
              <li
                key={cliente.id}
                id={`${listboxId}-${idx}`}
                role="option"
                aria-selected={activoIdx === idx}
                onClick={() => seleccionar(cliente)}
                onMouseEnter={() => setActivoIdx(idx)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                  activoIdx === idx ? 'bg-primary-50' : 'hover:bg-gray-50'
                }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  cliente.tipo_cliente === 'juridico'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {cliente.tipo_cliente === 'juridico'
                    ? <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                    : <User      className="w-3.5 h-3.5" aria-hidden="true" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{cliente.nombre}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {cliente.tipo_cliente === 'juridico'
                      ? [cliente.nit && `NIT: ${cliente.nit}`, cliente.nrc && `NRC: ${cliente.nrc}`].filter(Boolean).join(' · ')
                      : [
                          cliente.tipo_documento && cliente.num_documento && `${cliente.tipo_documento === '13' ? 'DUI' : cliente.tipo_documento}: ${cliente.num_documento}`,
                          cliente.correo,
                        ].filter(Boolean).join(' · ')
                    }
                  </p>
                </div>
                {cliente.total_dtes > 0 && (
                  <span className="text-xs text-gray-300 shrink-0">{cliente.total_dtes} DTE</span>
                )}
              </li>
            ))
          )}

          {/* Opción crear nuevo */}
          <li
            role="option"
            onClick={() => { setAbierto(false); setModalNuevo(true); }}
            className="flex items-center gap-2 px-4 py-3 cursor-pointer text-primary-600 hover:bg-primary-50 border-t border-gray-100 transition-colors">
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">
              Crear nuevo cliente
              {busqueda.trim() && ` "${busqueda.trim()}"`}
            </span>
          </li>
        </ul>
      )}

      {/* Modal crear cliente desde el selector */}
      <ModalCliente
        isOpen={modalNuevo}
        onClose={() => setModalNuevo(false)}
        onGuardar={onCrearCliente}
      />
    </div>
  );
};

export default SelectorCliente;
