// src/hooks/useTerritorio.js
// Carga los catálogos territoriales oficiales del MH para un departamento.
//
// Contexto (incidente 2026-10-13): CAT-013 (Municipio) y CAT-008 (Distrito)
// repiten códigos entre departamentos — el par (departamento, código) es la
// clave real. El backend filtra por departamento (GET /api/catalogos/:slug
// ?departamento=XX, migración 034). Sin respaldos estáticos: si la API falla,
// los selectores quedan vacíos y se expone `error` para avisar al usuario.
//
// Los setState ocurren solo en callbacks asíncronos (fetch) — nada de
// cascadas sincrónicas en el efecto (regla react-hooks/set-state-in-effect).

import { useEffect, useState } from 'react';
import { obtenerCatalogoApi } from '../api/catalogos.api';

// fila de catálogo (BD) → { value: codigo, label: 'descripcion (codigo)' }
const mapear = (rows = []) => rows.map((r) => ({
  value: String(r.codigo),
  label: `${r.descripcion} (${r.codigo})`,
}));

const ESTADO_INICIAL = {
  departamento: null,
  municipios:   [],
  distritos:    [],
  cargando:     false,
  error:        false,
};

/**
 * @param {string|null|undefined} departamentoCod — código CAT-012 (2 dígitos)
 * @returns {{ municipios, distritos, cargando, error }}
 */
export const useTerritorio = (departamentoCod) => {
  const [estado, setEstado] = useState(ESTADO_INICIAL);

  useEffect(() => {
    if (!departamentoCod) return undefined;

    let cancelado = false;

    Promise.resolve()
      .then(() => {
        if (cancelado) return null;
        setEstado((previo) => ({ ...previo, cargando: true, error: false }));
        return Promise.all([
          obtenerCatalogoApi('municipio', { departamento: departamentoCod }),
          obtenerCatalogoApi('distrito',  { departamento: departamentoCod }),
        ]);
      })
      .then((resultados) => {
        if (cancelado || !resultados) return;
        const [filasMunicipio, filasDistrito] = resultados;
        setEstado({
          departamento: departamentoCod,
          municipios:   mapear(filasMunicipio),
          distritos:    mapear(filasDistrito),
          cargando:     false,
          error:        false,
        });
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({
          departamento: departamentoCod,
          municipios:   [],
          distritos:    [],
          cargando:     false,
          error:        true,
        });
      });

    return () => { cancelado = true; };
  }, [departamentoCod]);

  // Si el departamento cambió (o se limpió) los datos visibles deben
  // corresponder al departamento actual — se derivan, sin setState.
  const vigente = Boolean(departamentoCod) && estado.departamento === departamentoCod;

  return {
    municipios: vigente ? estado.municipios : [],
    distritos:  vigente ? estado.distritos  : [],
    cargando:   Boolean(departamentoCod) && !vigente,
    error:      vigente ? estado.error : false,
  };
};
