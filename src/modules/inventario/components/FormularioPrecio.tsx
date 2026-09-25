"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Aviso } from "@/components/shared/Aviso";
import {
  CampoPesos,
  comoNumero,
  comoTexto,
} from "@/components/shared/CampoNumero";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCOP } from "@/lib/utils";
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

  // Se mira mientras se digita: enterarse de que el precio quedó bajo el costo
  // al intentar facturar, tres pantallas después, es tarde.
  const precio = form.watch("precioVenta");
  const costo = Number(producto?.saldo_costo_promedio ?? 0);
  const ultimaCompra =
    producto?.ultimo_costo_compra == null
      ? null
      : Number(producto.ultimo_costo_compra);
  const bajoCosto = costo > 0 && precio > 0 && precio < costo;
  const noRepone =
    !bajoCosto && ultimaCompra !== null && precio > 0 && precio < ultimaCompra;

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
          <Controller
            control={form.control}
            name="precioVenta"
            render={({ field }) => (
              <CampoPesos
                id="precioVenta"
                className={CONTROL}
                value={comoTexto(field.value)}
                onChange={(v) => field.onChange(comoNumero(v))}
                onBlur={field.onBlur}
              />
            )}
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

      {/* Avisa mientras se digita, y no bloquea: fijar un precio no vende
          nada. El que bloquea es el que emite la factura. */}
      {bajoCosto && (
        <Aviso
          tono="error"
          titulo="Ese precio pierde plata"
          cifra={formatCOP(costo - precio)}
        >
          El producto cuesta <b className="font-mono">{formatCOP(costo)}</b> en
          promedio y lo estás dejando en{" "}
          <b className="font-mono">{formatCOP(precio)}</b>: se pierde esa
          diferencia por unidad. El precio se puede guardar, pero facturar a ese
          valor lo va a tener que autorizar un DIRECTOR.
        </Aviso>
      )}

      {noRepone && (
        <Aviso
          tono="alarma"
          titulo="Con ese precio no lo reponés"
          cifra={formatCOP(ultimaCompra! - precio)}
        >
          Da ganancia contra el costo promedio, pero la última compra fue a{" "}
          <b className="font-mono">{formatCOP(ultimaCompra!)}</b>: si hay que
          volver a comprarlo hoy, esa diferencia sale de tu bolsillo.
        </Aviso>
      )}

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
