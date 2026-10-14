// src/components/dtes/emitir/Paso2Receptor.jsx
// Paso 2 del wizard — datos del receptor.
// FCF: por defecto "Consumidor final" sin datos (opcional).
// CCF/NC/ND: NIT + nombre requeridos; datos adicionales en bloque plegable.
// FSE: NIT + nombre. NC/ND incluyen el documento relacionado.

import { Info, ChevronDown, UserRound, Store } from 'lucide-react';
import { Controller, useWatch } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { useTerritorio } from '../../../hooks/useTerritorio';
import { Alert, AlertTitle, AlertDescription } from '@/components/shadcn/alert';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shadcn/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/shadcn/collapsible';
import { Separator } from '@/components/shadcn/separator';
import { Textarea } from '@/components/shadcn/textarea';
import { formatMonto } from '../../../utils/formatters';
import SelectorCliente from '../../clientes/SelectorCliente';
import FormField from './FormField';

const LIMITE_FCF_SIN_DATOS = 1095;

const Paso2Receptor = ({
  tipoDte, esCCF, esFSE, esNCND,
  register, errors, control, setValue,
  tiposDoc, departamentos,
  onSeleccionarCliente,
  fcfConDatos, onSetFcfConDatos,
  totalesPagar,
}) => {
  const requiereNit = esCCF || esFSE || esNCND;
  const requiereNombre = requiereNit;

  // Catálogos territoriales del departamento del receptor (CAT-013/CAT-008)
  const deptoReceptor = useWatch({ control, name: 'rec_depto' });
  const {
    municipios: municipiosReceptor,
    distritos:  distritosReceptor,
    cargando:   cargandoTerritorio,
    error:      errorTerritorio,
  } = useTerritorio(deptoReceptor);

  return (
    <div className="space-y-5">
      {/* ── Avisos contextuales ── */}
      {tipoDte === '01' && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle className="text-sm">Receptor opcional en FCF</AlertTitle>
          <AlertDescription className="text-xs">
            Para ventas menores a {formatMonto(LIMITE_FCF_SIN_DATOS)} podés emitir a «Consumidor final» sin
            ningún dato. Identificá al cliente si lo pedís para su factura o si el monto lo requiere.
          </AlertDescription>
        </Alert>
      )}

      {tipoDte === '01' && totalesPagar >= LIMITE_FCF_SIN_DATOS && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <Info aria-hidden="true" />
          <AlertTitle className="text-sm text-amber-900">
            Monto mayor o igual a {formatMonto(LIMITE_FCF_SIN_DATOS)}
          </AlertTitle>
          <AlertDescription className="text-xs text-amber-800">
            Hacienda requiere identificar al receptor cuando el total es mayor o igual a{' '}
            {formatMonto(LIMITE_FCF_SIN_DATOS)}. Agregá los datos del cliente.
          </AlertDescription>
        </Alert>
      )}

      {esNCND && (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle className="text-sm">Nota sobre DTE anterior</AlertTitle>
          <AlertDescription className="text-xs">
            Completá primero los datos del receptor del DTE original y luego el documento relacionado
            que aparece más abajo.
          </AlertDescription>
        </Alert>
      )}

      {/* ── FCF: consumidor final vs. datos ── */}
      {tipoDte === '01' && (
        <ToggleGroup
          type="single"
          value={fcfConDatos ? 'datos' : 'publico'}
          onValueChange={(v) => onSetFcfConDatos(v === 'datos')}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <ToggleGroupItem
            value="publico"
            className="h-auto flex-col items-start gap-2 rounded-xl border p-4 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/5"
          >
            <UserRound className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="font-semibold">Consumidor final</span>
            <span className="text-xs text-muted-foreground">
              Sin datos del receptor — recomendado para ventas de mostrador.
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="datos"
            className="h-auto flex-col items-start gap-2 rounded-xl border p-4 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/5"
          >
            <Store className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="font-semibold">Agregar datos del cliente</span>
            <span className="text-xs text-muted-foreground">
              Nombre, documento e identificación opcionales.
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      {/* ── Buscador de clientes guardados ── */}
      {!(tipoDte === '01' && !fcfConDatos) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Cliente guardado</p>
          <SelectorCliente tipoDte={tipoDte} valorActual="" onSeleccionar={onSeleccionarCliente} />
          <p className="text-xs text-muted-foreground">O completá los campos manualmente.</p>
        </div>
      )}

      {!(tipoDte === '01' && !fcfConDatos) && <Separator />}

      {/* ── Campos manuales ── */}
      {(fcfConDatos || requiereNit) && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">Datos del receptor</p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Nombre / razón social */}
            <div className="sm:col-span-2">
              <FormField
                label="Nombre / razón social"
                req={requiereNombre}
                error={errors.rec_nombre?.message}
                htmlFor="rec-nombre"
              >
                <Input
                  id="rec-nombre"
                  placeholder="Nombre completo o razón social"
                  aria-invalid={!!errors.rec_nombre}
                  {...register('rec_nombre')}
                />
              </FormField>
            </div>

            {/* FCF: tipo documento + número */}
            {tipoDte === '01' && (
              <>
                <FormField label="Tipo de documento" htmlFor="rec-tipo-doc">
                  <Controller
                    name="rec_tipo_doc"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="rec-tipo-doc"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {tiposDoc.map((d) => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField label="Número de documento" htmlFor="rec-num-doc">
                  <Input
                    id="rec-num-doc"
                    className="font-mono"
                    placeholder="00000000-0"
                    {...register('rec_num_doc')}
                  />
                </FormField>
              </>
            )}

            {/* NIT — CCF / FSE / NC / ND */}
            {requiereNit && (
              <FormField label="NIT" req error={errors.rec_nit?.message} htmlFor="rec-nit">
                <Input
                  id="rec-nit"
                  className={cn('font-mono', errors.rec_nit && 'border-destructive')}
                  placeholder="0000-000000-000-0"
                  aria-invalid={!!errors.rec_nit}
                  {...register('rec_nit')}
                />
              </FormField>
            )}

            <FormField label="Correo" error={errors.rec_correo?.message} htmlFor="rec-correo">
              <Input
                id="rec-correo"
                type="email"
                placeholder="correo@empresa.com"
                aria-invalid={!!errors.rec_correo}
                {...register('rec_correo')}
              />
            </FormField>

            <FormField label="Teléfono" htmlFor="rec-telefono">
              <Input id="rec-telefono" placeholder="00000000" {...register('rec_telefono')} />
            </FormField>
          </div>
        </div>
      )}

      {/* ── Datos adicionales CCF / NC / ND (plegables) ── */}
      {(esCCF || esNCND) && (
        <Collapsible className="rounded-xl border p-4">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="group flex w-full justify-between px-0 hover:bg-transparent"
            >
              <span className="text-sm font-medium text-foreground">
                Datos adicionales <span className="font-normal text-muted-foreground">(NRC, actividad, ubicación)</span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
            <FormField label="NRC" error={errors.rec_nrc?.message} htmlFor="rec-nrc">
              <Input id="rec-nrc" className="font-mono" placeholder="000000-0" {...register('rec_nrc')} />
            </FormField>
            <FormField label="Código de actividad económica" htmlFor="rec-cod-actividad">
              <Input id="rec-cod-actividad" className="font-mono" placeholder="00000" {...register('rec_cod_actividad')} />
            </FormField>
            <FormField label="Descripción de actividad" htmlFor="rec-desc-actividad">
              <Input
                id="rec-desc-actividad"
                placeholder="Ej: Venta al por menor..."
                {...register('rec_desc_actividad')}
              />
            </FormField>
            <FormField label="Departamento" htmlFor="rec-depto">
              <Controller
                name="rec_depto"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(valor) => {
                      field.onChange(valor);
                      setValue('rec_municipio', '');
                      setValue('rec_distrito', '');
                    }}
                  >
                    <SelectTrigger id="rec-depto"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {departamentos.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Municipio (CAT-013)"
              htmlFor="rec-municipio"
              error={errorTerritorio ? 'No se pudo cargar el catálogo. Reintentá.' : undefined}
            >
              <Controller
                name="rec_municipio"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={!deptoReceptor || cargandoTerritorio}
                  >
                    <SelectTrigger id="rec-municipio">
                      <SelectValue placeholder={cargandoTerritorio ? 'Cargando catálogo…' : 'Seleccionar...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {municipiosReceptor.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Distrito (CAT-008)" htmlFor="rec-distrito">
              <Controller
                name="rec_distrito"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={!deptoReceptor || cargandoTerritorio}
                  >
                    <SelectTrigger id="rec-distrito">
                      <SelectValue placeholder={cargandoTerritorio ? 'Cargando catálogo…' : 'Seleccionar...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {distritosReceptor.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── Documento relacionado — NC / ND ── */}
      {esNCND && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Documento relacionado</CardTitle>
            <CardDescription className="text-xs">
              Datos del DTE original al que aplica esta {tipoDte === '05' ? 'nota de crédito' : 'nota de débito'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label="Código de generación"
              req
              error={errors.doc_rel_codgen?.message}
              htmlFor="doc-rel-codgen"
            >
              <Input
                id="doc-rel-codgen"
                className={cn('font-mono text-sm', errors.doc_rel_codgen && 'border-destructive')}
                placeholder="UUID del DTE original"
                aria-invalid={!!errors.doc_rel_codgen}
                {...register('doc_rel_codgen')}
              />
            </FormField>
            <FormField label="Tipo DTE original" req error={errors.doc_rel_tipo?.message} htmlFor="doc-rel-tipo">
              <Controller
                name="doc_rel_tipo"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="doc-rel-tipo"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">FCF (01)</SelectItem>
                      <SelectItem value="03">CCF (03)</SelectItem>
                      <SelectItem value="04">Nota de Remisión (04)</SelectItem>
                      <SelectItem value="05">Nota de Crédito (05)</SelectItem>
                      <SelectItem value="06">Nota de Débito (06)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Fecha de emisión" req error={errors.doc_rel_fecha?.message} htmlFor="doc-rel-fecha">
              <Input
                id="doc-rel-fecha"
                type="date"
                className={errors.doc_rel_fecha && 'border-destructive'}
                aria-invalid={!!errors.doc_rel_fecha}
                {...register('doc_rel_fecha')}
              />
            </FormField>
          </CardContent>
        </Card>
      )}
    {/* ── Datos adicionales — NC/ND + FSE ── */}
      {(esNCND || esFSE) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Datos adicionales</CardTitle>
            <CardDescription className="text-xs">
              {esNCND
                ? 'Motivo de la nota — requerido por Hacienda en NC/ND'
                : 'Observaciones opcionales en FSE'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {esNCND && (
              <FormField
                label="Fusión (NIT)"
                note="Solo si aplica fusión empresarial — opcional"
                htmlFor="fusion"
              >
                <Input id="fusion" className="font-mono" placeholder="0000-000000-000-0" {...register('fusion')} />
              </FormField>
            )}
            <FormField
              label="Observaciones"
              note="Máximo 3000 caracteres"
              error={errors.observaciones?.message}
              htmlFor="obs"
            >
              <Textarea
                id="obs"
                rows={3}
                placeholder={esNCND ? 'Motivo de la nota...' : 'Observaciones adicionales...'}
                className="resize-none"
                aria-invalid={!!errors.observaciones}
                {...register('observaciones')}
              />
            </FormField>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Paso2Receptor;