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
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/shared/SelectField";
import { SearchPicker } from "@/components/shared/SearchPicker";
import { cn, formatCOP } from "@/lib/utils";
import type { VentaFormData } from "@/lib/validators";
import type { ProductoLookup } from "@/modules/dashboard/lookups/types";
import { useBuscarProductos } from "@/modules/dashboard/lookups/useLookups";
import { PORCENTAJES_IVA } from "../types/ventas.types";

const OPCIONES_IVA = PORCENTAJES_IVA.map((pct) => ({
  value: String(pct),
  label: `${pct}%`,
}));

/**
 * El piso lo dice el backend: `producto.precioPiso` es el costo de reposición
 * más el margen mínimo, compuesto allá porque el margen de la empresa está en
 * una configuración que solo el DIRECTOR puede leer.
 *
 * Acá no se recalcula: una regla escrita dos veces termina diciendo dos cosas.
 */
interface VentaLineasEditorProps {
  control: Control<VentaFormData>;
  register: UseFormRegister<VentaFormData>;
  setValue: UseFormSetValue<VentaFormData>;
  errors: FieldErrors<VentaFormData>;
}

export function VentaLineasEditor({
  control,
  register,
  setValue,
  errors,
}: VentaLineasEditorProps) {
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
            append({ productoId: "", cantidad: 1, precioUnitario: 0, porcentajeIva: 19 })
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
        <VentaLineaRow
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

interface VentaLineaRowProps extends VentaLineasEditorProps {
  indice: number;
  puedeEliminar: boolean;
  onRemove: () => void;
}

function VentaLineaRow({
  indice,
  control,
  register,
  setValue,
  errors,
  puedeEliminar,
  onRemove,
}: VentaLineaRowProps) {
  const [query, setQuery] = useState("");
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const [producto, setProducto] = useState<ProductoLookup | null>(null);
  const { data: productos = [], isFetching } = useBuscarProductos(query);

  const linea = useWatch({ control, name: `lineas.${indice}` });
  const cantidad = Number(linea?.cantidad ?? 0);
  const precio = Number(linea?.precioUnitario ?? 0);
  const subtotal = cantidad * precio;
  const erroresLinea = errors.lineas?.[indice];

  const piso = Number(producto?.precioPiso ?? 0);
  const bajoElPiso = Boolean(producto) && piso > 0 && precio < piso;
  const stock = Number(producto?.stock ?? 0);
  const sinStock = Boolean(producto?.manejaInventario) && cantidad > stock;

  const seleccionarProducto = (elegido: ProductoLookup) => {
    setProducto(elegido);
    setValue(`lineas.${indice}.productoId`, elegido.id, { shouldValidate: true });
    setValue(`lineas.${indice}.precioUnitario`, Number(elegido.precioVenta ?? 0));
    setValue(`lineas.${indice}.porcentajeIva`, Number(elegido.porcentajeIva ?? 0));
    setEtiqueta(`${elegido.nombre} · ${elegido.codigo}`);
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
              setProducto(null);
              setValue(`lineas.${indice}.productoId`, "", { shouldValidate: true });
            }}
            invalido={Boolean(erroresLinea?.productoId)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Cantidad</label>
          <Input
            type="number"
            step="0.001"
            min="0"
            {...register(`lineas.${indice}.cantidad`, { valueAsNumber: true })}
            className={cn((erroresLinea?.cantidad || sinStock) && "border border-destructive")}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Precio</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register(`lineas.${indice}.precioUnitario`, { valueAsNumber: true })}
            className={cn(
              erroresLinea?.precioUnitario && "border border-destructive",
              bajoElPiso && "border border-warning",
            )}
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
      </div>

      {/* Vender bajo el piso NO se bloquea: se autoriza. Bloquear duro empuja
          al vendedor a inventar productos falsos, que es peor que la rebaja. */}
      {bajoElPiso && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle size={13} strokeWidth={1.75} />
          Bajo el piso de {formatCOP(piso)}. La venta se registra igual y queda esperando la
          firma del director.
        </p>
      )}

      {sinStock && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle size={13} strokeWidth={1.75} />
          Hay {stock} en existencia. El backend rechaza la venta que deja el stock en negativo.
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
