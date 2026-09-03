"use client";

import { useState } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/shared/SelectField";
import { SearchPicker } from "@/components/shared/SearchPicker";
import { cn, formatCOP } from "@/lib/utils";
import type { CompraFormData } from "@/lib/validators";
import type { ProductoLookup } from "@/modules/dashboard/lookups/types";
import { useBuscarProductos } from "@/modules/dashboard/lookups/useLookups";
import { PORCENTAJES_IVA } from "../types/compras.types";

const OPCIONES_IVA = PORCENTAJES_IVA.map((pct) => ({
  value: String(pct),
  label: `${pct}%`,
}));

interface CompraLineasEditorProps {
  control: Control<CompraFormData>;
  register: UseFormRegister<CompraFormData>;
  setValue: UseFormSetValue<CompraFormData>;
  errors: FieldErrors<CompraFormData>;
}

export function CompraLineasEditor({ control, register, setValue, errors }: CompraLineasEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "lineas" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Líneas</h2>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => append({ productoId: "", cantidad: 1, costoUnitario: 0, porcentajeIva: 19 })}
        >
          <Plus size={14} strokeWidth={2} />
          Agregar línea
        </Button>
      </div>

      {typeof errors.lineas?.message === "string" && (
        <p className="text-xs text-destructive">{errors.lineas.message}</p>
      )}

      {fields.map((field, indice) => (
        <CompraLineaRow
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

interface CompraLineaRowProps {
  indice: number;
  control: Control<CompraFormData>;
  register: UseFormRegister<CompraFormData>;
  setValue: UseFormSetValue<CompraFormData>;
  errors: FieldErrors<CompraFormData>;
  puedeEliminar: boolean;
  onRemove: () => void;
}

function CompraLineaRow({
  indice,
  control,
  register,
  setValue,
  errors,
  puedeEliminar,
  onRemove,
}: CompraLineaRowProps) {
  const [query, setQuery] = useState("");
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const { data: productos = [], isFetching } = useBuscarProductos(query);

  const linea = useWatch({ control, name: `lineas.${indice}` });
  const subtotal = Number(linea?.cantidad ?? 0) * Number(linea?.costoUnitario ?? 0);
  const erroresLinea = errors.lineas?.[indice];

  const seleccionarProducto = (producto: ProductoLookup) => {
    setValue(`lineas.${indice}.productoId`, producto.id, { shouldValidate: true });
    // El costo que se propone es el de la última compra: la de hoy lo va a
    // reemplazar, así que sirve de referencia y no de verdad.
    setValue(`lineas.${indice}.costoUnitario`, Number(producto.ultimoCostoCompra ?? 0));
    setValue(`lineas.${indice}.porcentajeIva`, Number(producto.porcentajeIva ?? 0));
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
            getKey={(producto) => producto.id}
            renderItem={(producto) => (
              <span className="flex flex-col">
                <span className="truncate">{producto.nombre}</span>
                <span className="text-xs text-muted-foreground/70">
                  {producto.codigo} · stock {Number(producto.stock ?? 0)}
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
          <label className="mb-1 block text-xs text-muted-foreground">Costo</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register(`lineas.${indice}.costoUnitario`, { valueAsNumber: true })}
            className={cn(
              erroresLinea?.costoUnitario && "border border-destructive",
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
