"use client";

import { useState } from "react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/shared/SelectField";
import { SearchPicker } from "@/components/shared/SearchPicker";
import { cn, formatCOP } from "@/lib/utils";
import type { CotizacionFormData } from "@/lib/validators";
import type { ProductoLookup } from "@/modules/dashboard/lookups/types";
import { useBuscarProductos } from "@/modules/dashboard/lookups/useLookups";

const OPCIONES_IVA = [0, 5, 19].map((pct) => ({ value: String(pct), label: `${pct}%` }));

interface CotizacionLineasEditorProps {
  control: Control<CotizacionFormData>;
  register: UseFormRegister<CotizacionFormData>;
  setValue: UseFormSetValue<CotizacionFormData>;
  errors: FieldErrors<CotizacionFormData>;
}

/**
 * A diferencia de la venta, la línea NO exige producto del catálogo: una
 * cotización puede nombrar algo que todavía no existe. Como no mueve
 * inventario, no le hace falta — el paso que sí lo exige es convertirla.
 */
export function CotizacionLineasEditor({
  control,
  register,
  setValue,
  errors,
}: CotizacionLineasEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "lineas" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Líneas</h2>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() =>
            append({
              productoId: "",
              descripcion: "",
              cantidad: 1,
              precioUnitario: 0,
              porcentajeIva: 19,
            })
          }
        >
          <Plus size={14} strokeWidth={2} />
          Agregar línea
        </Button>
      </div>

      {typeof errors.lineas?.message === "string" && (
        <p className="text-xs text-destructive">{errors.lineas.message}</p>
      )}

      {fields.map((field, indice) => (
        <CotizacionLineaRow
          key={field.id}
          indice={indice}
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
          puedeEliminar={fields.length > 1}
          onRemove={() => remove(indice)}
        />
      ))}
    </div>
  );
}

interface CotizacionLineaRowProps extends CotizacionLineasEditorProps {
  indice: number;
  puedeEliminar: boolean;
  onRemove: () => void;
}

function CotizacionLineaRow({
  indice,
  control,
  register,
  setValue,
  errors,
  puedeEliminar,
  onRemove,
}: CotizacionLineaRowProps) {
  const [query, setQuery] = useState("");
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const { data: productos = [], isFetching } = useBuscarProductos(query);

  const linea = useWatch({ control, name: `lineas.${indice}` });
  const subtotal = Number(linea?.cantidad ?? 0) * Number(linea?.precioUnitario ?? 0);
  const erroresLinea = errors.lineas?.[indice];
  const esLibre = !linea?.productoId;

  const seleccionarProducto = (producto: ProductoLookup) => {
    setValue(`lineas.${indice}.productoId`, producto.id, { shouldValidate: true });
    setValue(`lineas.${indice}.precioUnitario`, Number(producto.precioVenta ?? 0));
    setValue(`lineas.${indice}.porcentajeIva`, Number(producto.porcentajeIva ?? 0));
    setValue(`lineas.${indice}.descripcion`, producto.nombre);
    setEtiqueta(`${producto.nombre} · ${producto.codigo}`);
  };

  return (
    <div className="rounded-xl border border-border bg-muted p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <label className="mb-1 block text-xs text-muted-foreground">Producto</label>
          <SearchPicker<ProductoLookup>
            query={query}
            onQueryChange={setQuery}
            items={productos}
            isLoading={isFetching}
            getKey={(item) => item.id}
            renderItem={(item) => (
              <span className="flex flex-col">
                <span className="truncate">{item.nombre}</span>
                <span className="text-xs text-muted-foreground/70">
                  {item.codigo}
                  {item.manejaInventario ? ` · stock ${Number(item.stock ?? 0)}` : " · servicio"}
                </span>
              </span>
            )}
            onSelect={seleccionarProducto}
            placeholder="Buscar producto…"
            etiquetaSeleccion={etiqueta}
            onLimpiar={() => {
              setEtiqueta(null);
              setValue(`lineas.${indice}.productoId`, "", { shouldValidate: true });
            }}
            invalido={Boolean(erroresLinea?.productoId)}
          />
          {typeof erroresLinea?.productoId?.message === "string" && (
            <p className="mt-1 text-xs text-destructive">{erroresLinea.productoId.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Cantidad</label>
          <Input
            type="number"
            step="0.001"
            min="0"
            {...register(`lineas.${indice}.cantidad`, { valueAsNumber: true })}
            className={cn(erroresLinea?.cantidad && "border border-destructive")}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Precio</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register(`lineas.${indice}.precioUnitario`, { valueAsNumber: true })}
            className={cn(erroresLinea?.precioUnitario && "border border-destructive")}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">IVA</label>
          <Controller
            control={control}
            name={`lineas.${indice}.porcentajeIva`}
            render={({ field }) => (
              <SelectField
                value={String(field.value)}
                onChange={(valor) => field.onChange(Number(valor))}
                options={OPCIONES_IVA}
              />
            )}
          />
        </div>

        <div className="sm:col-span-12">
          <label className="mb-1 block text-xs text-muted-foreground">
            Descripción {esLibre && <span className="text-destructive">· obligatoria</span>}
          </label>
          <Input
            {...register(`lineas.${indice}.descripcion`)}
            placeholder={
              esLibre ? "Qué se está cotizando" : "Opcional: sobrescribe el nombre del producto"
            }
          />
        </div>
      </div>

      {esLibre && (
        <p className="mt-2 text-xs text-muted-foreground/70">
          Ítem libre: sirve para cotizar. Para convertir la cotización en venta hay que crearlo
          en el catálogo — la venta mueve inventario y el inventario es por producto.
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground/70">
          Subtotal línea:{" "}
          <span className="font-mono text-muted-foreground">{formatCOP(subtotal)}</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={!puedeEliminar}
          className={cn(
            "inline-flex items-center gap-1 text-xs transition-colors",
            puedeEliminar
              ? "text-destructive hover:underline"
              : "cursor-not-allowed text-muted-foreground/70 opacity-50",
          )}
        >
          <Trash2 size={13} strokeWidth={1.75} />
          Quitar
        </button>
      </div>
    </div>
  );
}
