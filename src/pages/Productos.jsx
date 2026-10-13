// src/pages/Productos.jsx
// Gestión de productos — listado con búsqueda (debounce), filtros, crear, editar, eliminar.
// Estilo alineado al wizard de emisión: componentes shadcn + tarjetas blancas
// `rounded-xl border shadow-card`.

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Package, Plus, Pencil, Trash2, RefreshCw, Search } from 'lucide-react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/shadcn/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/shadcn/table';
import { Badge } from '@/components/shadcn/badge';
import Spinner from '../components/ui/Spinner';
import { useProductos } from '../hooks/useProductos';
import { useCatalogosUI } from '../hooks/useCatalogosUI';
import {
  crearProductoApi, actualizarProductoApi, eliminarProductoApi,
} from '../api/productos.api';
import ModalProducto from '../components/productos/ModalProducto';
import { formatMonto } from '../utils/formatters';

// Valor centinela para "todos" (Radix Select no acepta value="")
const TODOS = 'todos';

// Badge del tipo de venta del producto
const INFO_TIPO_VENTA = {
  gravada:  { label: 'Gravada',  variant: 'default' },
  no_sujeta: { label: 'No sujeta', variant: 'secondary' },
  exenta:   { label: 'Exenta',   variant: 'outline' },
};

// Label de un catálogo (tiposItem/unidades) por su código
const labelCatalogo = (lista, valor) =>
  lista.find((x) => String(x.value) === String(valor))?.label ?? '—';

const Productos = () => {
  const {
    productos, paginacion, isLoading, error,
    busqueda, setBusqueda,
    filtroTipoItem, setFiltroTipoItem,
    filtroTipoVenta, setFiltroTipoVenta,
    pagina, irPagina,
    recargar,
  } = useProductos({ limite: 10 });

  // Catálogos oficiales Hacienda (CAT-011 tipo de ítem, CAT-014 unidad de medida)
  const { tiposItem, unidades } = useCatalogosUI();

  const [modalAbierto,  setModalAbierto]  = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);
  const [eliminando,    setEliminando]    = useState(null);

  const cambiarBusqueda = (v) => { setBusqueda(v); irPagina(1); };
  const cambiarTipoItem = (v) => { setFiltroTipoItem(v === TODOS ? '' : v); irPagina(1); };
  const cambiarTipoVenta = (v) => { setFiltroTipoVenta(v === TODOS ? '' : v); irPagina(1); };

  const abrirCrear  = ()  => { setProductoEditar(null); setModalAbierto(true); };
  const abrirEditar = (p) => { setProductoEditar(p);    setModalAbierto(true); };
  const cerrarModal = ()  => setModalAbierto(false);

  const onGuardar = async (datos) => {
    if (productoEditar) {
      await actualizarProductoApi(productoEditar.id, datos);
      toast.success('Producto actualizado correctamente.');
    } else {
      await crearProductoApi(datos);
      toast.success('Producto creado correctamente.');
    }
    recargar();
  };

  const onEliminar = async (producto) => {
    if (!window.confirm(
      `¿Eliminar "${producto.nombre}"?\n\nEl producto se desactiva y desaparece del catálogo.`
    )) return;
    setEliminando(producto.id);
    try {
      await eliminarProductoApi(producto.id);
      toast.success('Producto eliminado.');
      recargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar el producto.');
    } finally {
      setEliminando(null);
    }
  };

  const total = paginacion.total ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">
            {total} producto{total !== 1 ? 's' : ''} en el catálogo
          </p>
        </div>
        <Button onClick={abrirCrear}>
          <Plus className="size-4" data-icon="inline-start" />
          Nuevo producto
        </Button>
      </div>

      {/* Buscador y filtros */}
      <div className="rounded-xl border bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => cambiarBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="pl-9"
              aria-label="Buscar productos"
            />
          </div>

          <Select value={filtroTipoItem || TODOS} onValueChange={cambiarTipoItem}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Tipo de ítem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los tipos</SelectItem>
              {tiposItem.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroTipoVenta || TODOS} onValueChange={cambiarTipoVenta}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tipo de venta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los tipos de venta</SelectItem>
              <SelectItem value="gravada">Gravada</SelectItem>
              <SelectItem value="no_sujeta">No sujeta</SelectItem>
              <SelectItem value="exenta">Exenta</SelectItem>
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" size="icon" onClick={recargar}
            aria-label="Actualizar listado">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Listado */}
      <div className="rounded-xl border bg-white shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground" role="alert">{error}</p>
            <Button variant="outline" onClick={recargar}>
              <RefreshCw className="size-4" data-icon="inline-start" /> Reintentar
            </Button>
          </div>
        ) : productos.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto mb-3 size-10 text-muted-foreground/25" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {busqueda || filtroTipoItem || filtroTipoVenta
                ? 'No se encontraron productos con esos filtros.'
                : 'Aún no tienes productos registrados.'}
            </p>
            {!busqueda && !filtroTipoItem && !filtroTipoVenta && (
              <Button onClick={abrirCrear} className="mt-4">
                <Plus className="size-4" data-icon="inline-start" /> Crear primer producto
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Producto</TableHead>
                <TableHead className="hidden md:table-cell">Tipo de ítem</TableHead>
                <TableHead className="hidden md:table-cell">Unidad</TableHead>
                <TableHead className="text-right">Precio unitario</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo de venta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((p) => {
                const infoVenta = INFO_TIPO_VENTA[p.tipo_venta] || INFO_TIPO_VENTA.gravada;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="max-w-[320px] truncate text-sm font-medium">{p.nombre}</p>
                      {p.codigo && (
                        <p className="mt-0.5 text-xs font-mono text-muted-foreground">{p.codigo}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {labelCatalogo(tiposItem, p.tipo_item)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {labelCatalogo(unidades, p.uni_medida)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums">
                      {formatMonto(p.precio_unitario)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={infoVenta.variant}>{infoVenta.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button" variant="ghost" size="icon"
                          onClick={() => abrirEditar(p)}
                          aria-label={`Editar producto ${p.nombre}`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button" variant="ghost" size="icon"
                          onClick={() => onEliminar(p)}
                          disabled={eliminando === p.id}
                          aria-label={`Eliminar producto ${p.nombre}`}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Paginación simple */}
        {!isLoading && !error && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Página {paginacion.pagina ?? 1} de {paginacion.paginas ?? 1} {`(${total} producto${total !== 1 ? 's' : ''})`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button" variant="outline" size="sm"
                disabled={pagina <= 1}
                onClick={() => irPagina(pagina - 1)}
              >
                Anterior
              </Button>
              <Button
                type="button" variant="outline" size="sm"
                disabled={pagina >= (paginacion.paginas ?? 1)}
                onClick={() => irPagina(pagina + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <ModalProducto
        isOpen={modalAbierto}
        onClose={cerrarModal}
        onGuardar={onGuardar}
        producto={productoEditar}
        tiposItem={tiposItem}
        unidades={unidades}
      />
    </div>
  );
};

export default Productos;