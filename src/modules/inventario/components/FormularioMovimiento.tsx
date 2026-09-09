"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorProducto } from "./SelectorProducto";
import type { ProductoResumen, TipoMovimiento } from "../types/inventario.types";

// Un solo esquema para los tres tipos, con `costoUnitario` opcional: la
// salida de ajuste no lo pide (se valora al promedio vigente), pero
// distinguir dos formularios enteros por eso obligaba a manejar dos
// instancias de `useForm` con tipos que `react-hook-form` no puede unificar
// al registrar un campo común. El campo se sigue ocultando en el JSX para
// esa variante, y `kardexApi.salidaAjuste` ya lo descarta antes de mandarlo.
const esquema = z.object({
  fecha: z.string().min(1, "Requerido"),
  cantidad: z.number().positive("Tiene que ser mayor a cero"),
  costoUnitario: z.number().min(0, "No puede ser negativo").optional(),
  motivo: z.string().min(3, "Contá qué pasó").max(300),
});

export type DatosMovimiento = z.infer<typeof esquema>;

const CONTROL = "h-11 rounded-xl px-4";
const hoy = () => new Date().toISOString().slice(0, 10);

const NOTA: Record<TipoMovimiento, string | null> = {
  ENTRADA_INICIAL:
    "Esta carga no genera asiento contable: es la existencia con la que arranca el producto.",
  ENTRADA_AJUSTE: "Esto va a generar un movimiento contable automático.",
  SALIDA_AJUSTE: "Esto va a generar un movimiento contable automático.",
};

/**
 * Uno solo para los tres tipos de movimiento: comparten casi todos los
 * campos, y solo la salida de ajuste no pide costo (se valora al promedio
 * vigente, no a uno nuevo).
 *
 * `producto` viene fijo cuando se abre desde la ficha de un producto; si
 * viene `null` con `onProducto`, se abrió desde la pestaña Kardex y hay que
 * elegir a cuál producto aplica.
 */
export function FormularioMovimiento({
  id,
  tipo,
  producto,
  onProducto,
  existencia,
  configurado,
  alGuardar,
}: {
  id: string;
  tipo: TipoMovimiento;
  producto: ProductoResumen | null;
  onProducto?: (producto: ProductoResumen) => void;
  /** El saldo vigente, para mostrarlo y para el mensaje de "no alcanza". */
  existencia: string | null;
  /** Si la empresa ya fijó la cuenta de ajuste. La carga inicial no la necesita. */
  configurado: boolean;
  alGuardar: (datos: DatosMovimiento) => void;
}) {
  const sinCosto = tipo === "SALIDA_AJUSTE";

  const form = useForm<DatosMovimiento>({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: hoy(), cantidad: 0, costoUnitario: 0, motivo: "" },
  });
  const errores = form.formState.errors;

  const bloqueado = tipo !== "ENTRADA_INICIAL" && !configurado;

  return (
    <form id={id} className="flex flex-col gap-5" onSubmit={form.handleSubmit(alGuardar)}>
      {onProducto ? (
        <Campo id="producto" etiqueta="Producto *" escala="grande">
          <SelectorProducto valor={producto} onElegir={onProducto} />
        </Campo>
      ) : (
        <p className="rounded-2xl bg-muted p-4 text-sm">
          <span className="font-semibold">{producto?.nombre ?? "Selecciona un producto"}</span>
          {producto && (
            <>
              {" · "}Existencia actual: <span className="font-mono font-semibold">{existencia ?? "0"} unidades</span>
            </>
          )}
        </p>
      )}

      {NOTA[tipo] && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm ${
            tipo === "ENTRADA_INICIAL" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {NOTA[tipo]}
        </div>
      )}

      {bloqueado && (
        <div className="rounded-2xl bg-warning/10 p-4 text-sm text-warning">
          Configura la cuenta contable de ajustes antes de registrar entradas o salidas.
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="fecha" etiqueta="Fecha *" error={errores.fecha?.message} escala="grande">
          <Input id="fecha" type="date" className={CONTROL} {...form.register("fecha")} />
        </Campo>

        <Campo id="cantidad" etiqueta="Cantidad *" error={errores.cantidad?.message} escala="grande">
          <Input
            id="cantidad"
            type="number"
            min="0.000001"
            step="any"
            className={CONTROL}
            {...form.register("cantidad", { valueAsNumber: true })}
          />
        </Campo>

        {!sinCosto && (
          <Campo
            id="costoUnitario"
            etiqueta="Costo unitario *"
            error={errores.costoUnitario?.message}
            escala="grande"
          >
            <Input
              id="costoUnitario"
              type="number"
              min="0"
              step="any"
              className={CONTROL}
              {...form.register("costoUnitario", { valueAsNumber: true })}
            />
          </Campo>
        )}
      </div>

      <Campo id="motivo" etiqueta="Motivo *" error={errores.motivo?.message} escala="grande">
        <Textarea
          id="motivo"
          className="min-h-24 rounded-xl px-4 py-3"
          placeholder="Explica el motivo del movimiento"
          {...form.register("motivo")}
        />
      </Campo>
    </form>
  );
}
