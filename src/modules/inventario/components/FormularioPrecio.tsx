"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorProducto } from "./SelectorProducto";
import type { ProductoResumen } from "../types/inventario.types";

const esquema = z.object({
  precioVenta: z.number().min(0, "No puede ser negativo"),
  fechaInicio: z.string().min(1, "Requerido"),
  nota: z.string().max(500).optional(),
});

export type DatosPrecio = z.infer<typeof esquema>;

const CONTROL = "h-11 rounded-xl px-4";

const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * Cambiar de precio nunca es un `UPDATE`: cierra la fila vigente y abre una
 * nueva. Por eso este formulario no pide "editar" nada, solo el precio que
 * arranca a regir desde una fecha.
 *
 * `producto` viene fijo cuando se abre desde el detalle de un producto; si
 * viene `null` con `onProducto`, se abrió desde la bitácora general y hay que
 * elegir a cuál producto aplica.
 */
export function FormularioPrecio({
  id,
  producto,
  onProducto,
  alGuardar,
}: {
  id: string;
  producto: ProductoResumen | null;
  onProducto?: (producto: ProductoResumen) => void;
  alGuardar: (datos: DatosPrecio) => void;
}) {
  const form = useForm<DatosPrecio>({
    resolver: zodResolver(esquema),
    defaultValues: { precioVenta: 0, fechaInicio: hoy(), nota: "" },
  });
  const errores = form.formState.errors;

  return (
    <form
      id={id}
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit(alGuardar)}
    >
      {onProducto && (
        <Campo id="producto" etiqueta="Producto *" escala="grande">
          <SelectorProducto valor={producto} onElegir={onProducto} />
        </Campo>
      )}

      {!onProducto && producto && (
        <p className="rounded-2xl bg-muted p-4 text-sm">
          <span className="font-mono text-xs text-muted-foreground">
            {producto.codigo}
          </span>
          <span className="mx-2 text-muted-foreground">·</span>
          {producto.nombre}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="precioVenta"
          etiqueta="Nuevo precio *"
          error={errores.precioVenta?.message}
          escala="grande"
        >
          <Input
            id="precioVenta"
            type="number"
            min="0"
            step="0.01"
            className={CONTROL}
            {...form.register("precioVenta", { valueAsNumber: true })}
          />
        </Campo>

        <Campo
          id="fechaInicio"
          etiqueta="Vigente desde *"
          error={errores.fechaInicio?.message}
          escala="grande"
        >
          <Input
            id="fechaInicio"
            type="date"
            className={CONTROL}
            {...form.register("fechaInicio")}
          />
        </Campo>
      </div>

      <Campo
        id="nota"
        etiqueta="Nota / motivo"
        ayuda="Opcional"
        escala="grande"
      >
        <Textarea
          id="nota"
          className="min-h-24 rounded-xl px-4 py-3"
          placeholder="Este campo es opcional"
          {...form.register("nota")}
        />
      </Campo>
    </form>
  );
}
