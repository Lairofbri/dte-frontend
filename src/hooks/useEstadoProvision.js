// src/hooks/useEstadoProvision.js
// Hook de estado de provisión de empresas (Fase 2).
// Plataforma: lista global + alta de empresas. Administrador: solo su tenant.

import { useState, useEffect, useCallback } from 'react';
import { toast }                             from 'react-hot-toast';
import {
  obtenerEstadoProvisionApi,
  crearTenantPlataformaApi,
  actualizarTenantPlataformaApi,
  actualizarAdminTenantPlataformaApi,
} from '../api/provisioning.api';

export const useEstadoProvision = ({ enabled = true } = {}) => {
  const [tenants,           setTenants]           = useState([]);
  const [isLoading,         setIsLoading]         = useState(true);
  const [error,             setError]             = useState(null);
  const [contadorRecarga,   setContadorRecarga]   = useState(0);
  const [creando,           setCreando]           = useState(false);
  const [actualizando,      setActualizando]      = useState(false);

  useEffect(() => {
    let cancelado = false;

    if (!enabled) return () => { cancelado = true; };

    const cargar = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const datos = await obtenerEstadoProvisionApi();
        if (!cancelado) setTenants(datos ?? []);
      } catch {
        if (!cancelado) setError('No se pudo cargar el estado de provisión.');
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };

    cargar();
    return () => { cancelado = true; };
  }, [contadorRecarga, enabled]);

  const recargar = useCallback(() => setContadorRecarga((p) => p + 1), []);

  // Alta de empresa desde DTE (rol plataforma). Genera tenant_id y
  // operation_id (UUID v4) — misma convención que el POS.
  // 2026-10-07: se crea SIEMPRE el usuario administrador DTE del tenant;
  // el usuario POS (mismo admin + PIN) solo si crear_pos=true (toggle:
  // no todas las empresas necesitan POS).
  const crearEmpresa = useCallback(async ({
    nombre, nombre_comercial, nit, nrc,
    email_admin, password, pin, nombre_usuario, apellido, crearPos = false,
    establecimiento,
  }) => {
    setCreando(true);
    try {
      const tenant = await crearTenantPlataformaApi({
        tenant_id:     crypto.randomUUID(),
        operation_id:  crypto.randomUUID(),
        nombre,
        nombre_comercial: nombre_comercial || null,
        nit,
        nrc: nrc || null,
        email_admin,
        password,
        nombre_usuario,
        apellido: apellido || null,
        crear_usuario_pos: crearPos,
        pin: crearPos ? pin : null,
        // Bootstrap (2026-10-10): establecimiento fiscal inicial con el que
        // la empresa nace operativa (config, correlativos y admin asignado).
        establecimiento: {
          nombre:               establecimiento.nombre.trim(),
          direccion:            establecimiento.direccion.trim(),
          departamento_cod:     establecimiento.departamento_cod,
          municipio_cod:        establecimiento.municipio_cod,
          cod_estable_mh:       establecimiento.cod_estable_mh.trim().toUpperCase(),
          cod_punto_venta_mh:   establecimiento.cod_punto_venta_mh.trim().toUpperCase(),
          tipo_establecimiento: '02',
        },
      });
      toast.success(crearPos
        ? 'Empresa y usuarios (DTE + POS) creados.'
        : 'Empresa creada con su administrador DTE.');
      recargar();
      return tenant;
    } finally {
      setCreando(false);
    }
  }, [recargar]);

  // Edición de empresa desde plataforma (2026-10-10): datos de la empresa
  // (SIN NIT — inmutable) y credenciales del administrador inicial.
  // Password del admin vacío = no cambia (patrón password_hacienda).
  const actualizarEmpresa = useCallback(async ({
    tenantId,
    nombre, nombre_comercial, nrc,
    email_admin, nombre_admin, password_admin,
  }) => {
    setActualizando(true);
    try {
      await actualizarTenantPlataformaApi(tenantId, {
        nombre,
        nombre_comercial: nombre_comercial || null,
        nrc: nrc || null,
      });

      const datosAdmin = {};
      if (email_admin) datosAdmin.email = email_admin;
      if (nombre_admin) datosAdmin.nombre = nombre_admin;
      if (password_admin) datosAdmin.password = password_admin;
      if (Object.keys(datosAdmin).length > 0) {
        await actualizarAdminTenantPlataformaApi(tenantId, datosAdmin);
      }

      toast.success('Empresa actualizada correctamente.');
      recargar();
    } finally {
      setActualizando(false);
    }
  }, [recargar]);

  return {
    tenants: enabled ? tenants : [],
    isLoading: enabled && isLoading,
    error: enabled ? error : null,
    creando,
    actualizando,
    recargar,
    crearEmpresa,
    actualizarEmpresa,
  };
};