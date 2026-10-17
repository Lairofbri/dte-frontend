// src/hooks/useTiposDocumento.js
// Carga el catálogo oficial CAT-022 (tipo de documento de identificación)
// desde la base de datos vía GET /api/catalogos/tipo-documento-identificacion.
//
// NO se quema la lista en el frontend: Hacienda define los códigos (NIT, DUI,
// Pasaporte, Carnet de Residente, Otro) y el backend los sirve desde la tabla
// cat_022_tipo_documento_identificacion (migración 027). Si la API falla, la
// lista queda vacía y se expone `error` (mismo criterio que useCatalogosUI).

import { useEffect, useState } from 'react';
import { obtenerCatalogoApi } from '../api/catalogos.api';

// fila de catálogo (BD) → { value: codigo, label: descripcion }
const mapear = (rows = []) => rows.map((r) => ({
  value: String(r.codigo),
  label: r.descripcion,
}));

export const useTiposDocumento = () => {
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;

    obtenerCatalogoApi('tipo-documento-identificacion')
      .then((filas) => {
        if (cancelado) return;
        setTiposDocumento(mapear(filas));
        setCargando(false);
      })
      .catch(() => {
        if (cancelado) return;
        setTiposDocumento([]);
        setError(true);
        setCargando(false);
      });

    return () => { cancelado = true; };
  }, []);

  return { tiposDocumento, cargando, error };
};
