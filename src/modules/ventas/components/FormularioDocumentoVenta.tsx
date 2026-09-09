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
import { Campo } from "@/modules/configuracion/components/Campo";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { SelectorTercero } from "./SelectorTercero";
import {
  EditorLineasVenta,
  lineaVentaVacia,
  type LineaVentaBorrador,
} from "./EditorLineasVenta";
import type { CrearCotizacionInput } from "../types/ventas.types";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (datos: CrearCotizacionInput) => void;
  guardando: boolean;
  titulo: string;
  descripcion: string;
  etiquetaBoton: string;
}) {
  const [tercero, setTercero] = useState<TerceroResumen | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [lineas, setLineas] = useState<LineaVentaBorrador[]>([
    lineaVentaVacia(),
  ]);

  const limpiar = () => {
    setTercero(null);
    setFecha(hoy());
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

            <Campo id="fecha" etiqueta="Fecha" escala="grande">
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="h-11 rounded-xl px-4"
              />
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
