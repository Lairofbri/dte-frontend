// src/hooks/useCatalogosUI.js
// Carga los catálogos oficiales de Hacienda que necesita el wizard de emisión.
// Los catálogos viven en la base de datos (migración 027 — tablas cat_*,
// globales para todas las empresas) y se consumen por GET /api/catalogos/:slug.
// No hay respaldos estáticos en el frontend: si la API falla, los selectores
// quedan vacíos y se expone `error` para avisar al usuario.

import { useState, useEffect } from 'react';
import { obtenerCatalogoApi } from '../api/catalogos.api';

// mapear fila de catálogo (BD) → { value: codigo, label: 'descripcion (codigo)' }
// Así en la UI siempre se ve qué significa cada código de Hacienda.
const mapear = (rows = []) => rows.map((r) => ({
  value: String(r.codigo),
  label: `${r.descripcion} (${r.codigo})`,
}));

const SLUGS = [
  'unidad-medida',                      // CAT-014
  'forma-pago',                         // CAT-017
  'tipo-item',                          // CAT-011
  'tipo-documento-identificacion',      // CAT-022
  'departamento',                       // CAT-012
  'plazo',                              // CAT-018
];

export const useCatalogosUI = () => {
  const [unidades,      setUnidades]      = useState([]);
  const [formasPago,    setFormasPago]    = useState([]);
  const [tiposItem,     setTiposItem]     = useState([]);
  const [tiposDoc,      setTiposDoc]      = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [plazos,        setPlazos]        = useState([]);
  const [cargados,      setCargados]      = useState(false);
  const [error,         setError]         = useState(false);

  useEffect(() => {
    let cancelado = false;

    Promise.all(SLUGS.map((slug) => obtenerCatalogoApi(slug)))
      .then((resultados) => {
        if (cancelado) return;
        setUnidades(mapear(resultados[0]));
        setFormasPago(mapear(resultados[1]));
        setTiposItem(mapear(resultados[2]));
        setTiposDoc(mapear(resultados[3]));
        setDepartamentos(mapear(resultados[4]));
        setPlazos(mapear(resultados[5]));
        setCargados(true);
      })
      .catch(() => {
        if (cancelado) return;
        setError(true);
      });

    return () => { cancelado = true; };
  }, []);

  return {
    unidades, formasPago, tiposItem, tiposDoc,
    departamentos, plazos, cargados, error,
  };
};