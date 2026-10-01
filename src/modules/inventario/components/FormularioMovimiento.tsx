"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorTercero } from "@/modules/ventas/components/SelectorTercero";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import {
  CampoCantidad,
  CampoPesos,
  comoNumero,
  comoTexto,
} from "@/components/shared/CampoNumero";
import { admiteDecimales } from "@/lib/numeros";
import { cn } from "@/lib/utils";
import { SelectorProducto } from "./SelectorProducto";
import type {
  ProductoResumen,
  TipoMovimiento,
} from "../types/inventario.types";

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
  motivo: z.string().min(3, "Indique qué pasó").max(300),
  // Solo la salida de ajuste: quién asume lo que falta.
  tratamientoFaltante: z.enum(["EMPRESA", "RESPONSABLE"]).optional(),
  responsableTerceroId: z.string().optional(),
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
  alGuardar,
}: {
  id: string;
  tipo: TipoMovimiento;
  producto: ProductoResumen | null;
  onProducto?: (producto: ProductoResumen) => void;
  /** El saldo vigente, para mostrarlo y para el mensaje de "no alcanza". */
  existencia: string | null;
  alGuardar: (datos: DatosMovimiento) => void;
}) {
  const sinCosto = tipo === "SALIDA_AJUSTE";

  const form = useForm<DatosMovimiento>({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: hoy(), cantidad: 0, costoUnitario: 0, motivo: "" },
  });
  const errores = form.formState.errors;

  // Un faltante lo asume la empresa (merma, daño) o lo paga alguien: lo sabe
  // quien contó la bodega, así que no viene elegido.
  const faltante = tipo === "SALIDA_AJUSTE";
  const tratamiento = form.watch("tratamientoFaltante");
  const [responsable, setResponsable] = useState<TerceroResumen | null>(null);
  const [intento, setIntento] = useState(false);
  const faltaTratamiento = faltante && tratamiento === undefined;
  const faltaResponsable = faltante && tratamiento === "RESPONSABLE" && responsable === null;

  return (
    <form
      id={id}
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        setIntento(true);
        // Una cantidad con decimales en un producto que va por unidades: pasa
        // si se eligió el producto después de digitarla.
        if (
          producto !== null &&
          !admiteDecimales(producto.unidad_medida) &&
          !Number.isInteger(form.getValues("cantidad"))
        ) {
          e.preventDefault();
          form.setError("cantidad", {
            message: "Este producto va en números enteros.",
          });
          return;
        }
        if (faltaTratamiento || faltaResponsable) {
          e.preventDefault();
          return;
        }
        void form.handleSubmit(alGuardar)(e);
      }}
    >
      {onProducto ? (
        <Campo id="producto" etiqueta="Producto *" escala="grande">
          <SelectorProducto valor={producto} onElegir={onProducto} />
        </Campo>
      ) : (
        <p className="rounded-2xl bg-muted p-4 text-sm">
          <span className="font-semibold">
            {producto?.nombre ?? "Seleccione un producto"}
          </span>
          {producto && (
            <>
              {" · "}Existencia actual:{" "}
              <span className="font-mono font-semibold">
                {existencia ?? "0"} unidades
              </span>
            </>
          )}
        </p>
      )}

      {NOTA[tipo] && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm ${
            tipo === "ENTRADA_INICIAL"
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          }`}
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {NOTA[tipo]}
        </div>
      )}


      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="fecha"
          etiqueta="Fecha *"
          error={errores.fecha?.message}
          escala="grande"
        >
          <Input
            id="fecha"
            type="date"
            className={CONTROL}
            {...form.register("fecha")}
          />
        </Campo>

        <Campo
          id="cantidad"
          etiqueta="Cantidad *"
          error={errores.cantidad?.message}
          escala="grande"
        >
          <Controller
            control={form.control}
            name="cantidad"
            render={({ field }) => (
              <CampoCantidad
                id="cantidad"
                unidad={producto?.unidad_medida}
                className={CONTROL}
                value={comoTexto(field.value)}
                onChange={(v) => field.onChange(comoNumero(v))}
                onBlur={field.onBlur}
              />
            )}
          />
        </Campo>

        {!sinCosto && (
          <Campo
            id="costoUnitario"
            etiqueta="Costo unitario *"
            error={errores.costoUnitario?.message}
            escala="grande"
          >
            <Controller
              control={form.control}
              name="costoUnitario"
              render={({ field }) => (
                <CampoPesos
                  id="costoUnitario"
                  className={CONTROL}
                  value={comoTexto(field.value)}
                  onChange={(v) => field.onChange(comoNumero(v))}
                  onBlur={field.onBlur}
                />
              )}
            />
          </Campo>
        )}
      </div>

      {faltante && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            ¿Quién responde por lo que falta?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
            {(
              [
                ["EMPRESA", "Lo asume la empresa", "Merma, daño o pérdida: se registra como gasto."],
                ["RESPONSABLE", "Lo paga el responsable", "Queda como cuenta por cobrar a esa persona."],
              ] as const
            ).map(([valor, titulo, detalle]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={tratamiento === valor}
                onClick={() => form.setValue("tratamientoFaltante", valor)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  tratamiento === valor ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                )}
              >
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{detalle}</span>
              </button>
            ))}
          </div>
          {intento && faltaTratamiento && (
            <p className="text-sm text-danger">Elija una de las dos para poder registrar el faltante.</p>
          )}
          {tratamiento === "RESPONSABLE" && (
            <Campo
              id="responsable"
              etiqueta="¿A quién se le cobra? *"
              error={intento && faltaResponsable ? "Elija a quién se le cobra" : undefined}
              escala="grande"
            >
              <SelectorTercero
                rol="empleado"
                valor={responsable}
                onElegir={(t) => {
                  setResponsable(t);
                  form.setValue("responsableTerceroId", t.id);
                }}
                invalido={intento && faltaResponsable}
              />
            </Campo>
          )}
        </fieldset>
      )}

      <Campo
        id="motivo"
        etiqueta="Motivo *"
        error={errores.motivo?.message}
        escala="grande"
      >
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
