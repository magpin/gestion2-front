"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatFecha, hoyEnColombia } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { SelectorTercero } from "./SelectorTercero";
import {
  EditorLineasVenta,
  lineaVentaVacia,
  type LineaVentaBorrador,
} from "./EditorLineasVenta";
import type { CrearCotizacionInput } from "../types/ventas.types";

/**
 * El formulario de cotización y el de factura son el mismo: cliente, fecha
 * y líneas de producto/cantidad — el `CrearFacturaInput` del backend tiene
 * exactamente esta forma. Lo que cambia entre las dos es el endpoint que
 * llama y lo que pasa después (una factura asienta y descuenta kardex, una
 * cotización no), y eso lo decide quien usa este componente, no el
 * formulario.
 */
export function FormularioDocumentoVenta({
  abierto,
  onCerrar,
  onGuardar,
  guardando,
  titulo,
  descripcion,
  etiquetaBoton,
  fechaDeHoy = false,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (datos: CrearCotizacionInput) => void;
  guardando: boolean;
  titulo: string;
  descripcion: string;
  etiquetaBoton: string;
  /**
   * Una factura se emite hoy y ninguna otra fecha, así que el campo se
   * muestra fijo. Una cotización no es un documento fiscal —no numera contra
   * la resolución ni asienta— y puede fecharse cuando haga falta.
   */
  fechaDeHoy?: boolean;
}) {
  const [tercero, setTercero] = useState<TerceroResumen | null>(null);
  const [fecha, setFecha] = useState(hoyEnColombia());
  const [lineas, setLineas] = useState<LineaVentaBorrador[]>([
    lineaVentaVacia(),
  ]);

  const limpiar = () => {
    setTercero(null);
    setFecha(hoyEnColombia());
    setLineas([lineaVentaVacia()]);
  };

  const sinProducto = lineas
    .map((l, i) => (l.producto === null ? i + 1 : null))
    .filter((n): n is number => n !== null);
  const sinCantidad = lineas
    .map((l, i) =>
      l.cantidad.trim() === "" || Number(l.cantidad) <= 0 ? i + 1 : null,
    )
    .filter((n): n is number => n !== null);

  const nombrar = (renglones: number[]) =>
    renglones.length === 1
      ? `el renglón ${renglones[0]}`
      : `los renglones ${renglones.join(", ")}`;

  const impedimento = (): string | null => {
    if (tercero === null) return "Elegí el cliente.";
    if (fecha === "") return "Elegí la fecha.";
    if (lineas.length === 0) return "Agregá al menos una línea.";
    if (sinProducto.length > 0)
      return `Falta el producto en ${nombrar(sinProducto)}.`;
    if (sinCantidad.length > 0)
      return `La cantidad tiene que ser mayor a cero en ${nombrar(sinCantidad)}.`;
    return null;
  };

  const problema = impedimento();

  const enviar = () => {
    if (problema !== null || tercero === null) return;
    onGuardar({
      terceroId: tercero.id,
      fecha,
      lineas: lineas.map((l) => ({
        productoId: l.producto!.id,
        cantidad: Number(l.cantidad),
      })),
    });
  };

  return (
    <Dialog
      open={abierto}
      onOpenChange={(a) => {
        if (!a) {
          onCerrar();
          limpiar();
        }
      }}
    >
      <DialogContent size="xl">
        <DialogHeader>
          <div>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descripcion}</DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-8">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Campo id="tercero" etiqueta="Cliente" escala="grande">
              <SelectorTercero valor={tercero} onElegir={setTercero} />
            </Campo>

            <Campo
              id="fecha"
              etiqueta="Fecha"
              escala="grande"
              ayuda={fechaDeHoy ? "Un documento fiscal se emite el día que se emite: no se atrasa ni se adelanta." : undefined}
            >
              {fechaDeHoy ? (
                <p
                  id="fecha"
                  className="flex h-11 items-center rounded-xl border border-border bg-muted/40 px-4 text-sm font-medium"
                >
                  {formatFecha(fecha)}
                </p>
              ) : (
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="h-11 rounded-xl px-4"
                />
              )}
            </Campo>
          </div>

          <EditorLineasVenta lineas={lineas} onCambiar={setLineas} />
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <p className="self-center text-sm text-muted-foreground">
            {problema ?? "Listo para guardar."}
          </p>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={onCerrar}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-12 rounded-xl px-6"
              disabled={problema !== null || guardando}
              onClick={enviar}
            >
              {guardando && <Loader2 className="size-4 animate-spin" />}
              {etiquetaBoton}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
