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
import { Textarea } from "@/components/ui/textarea";
import { formatFecha, hoyEnColombia } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import {
  EditorLineasVenta,
  lineaVentaVacia,
  type LineaVentaBorrador,
} from "./EditorLineasVenta";
import { SelectorFacturaVigente } from "./SelectorFacturaVigente";
import type {
  CrearNotaDebitoInput,
  VentaDocumentoResumen,
} from "../types/ventas.types";

/**
 * Nota débito: le cobra más al cliente sobre una factura que ya existe.
 *
 * Es el espejo de la nota crédito y se parece poco: la nota crédito devuelve
 * lo que la factura ya decía, y por eso no pide líneas. Acá lo que se cobra
 * es un concepto nuevo —un flete que no se cobró, un interés de mora, un
 * mayor valor facturado de menos—, así que cada línea trae su producto, su
 * cantidad y su precio **digitado**: el precio de lista del catálogo no tiene
 * nada que ver con esto.
 *
 * `facturaFija`, cuando viene, la deja sin cambiar y sin buscador: es el caso
 * de abrir esto desde una fila de facturas ya elegida.
 */
export function FormularioNotaDebito({
  abierto,
  onCerrar,
  onGuardar,
  guardando,
  facturaFija,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (datos: CrearNotaDebitoInput) => void;
  guardando: boolean;
  facturaFija?: VentaDocumentoResumen;
}) {
  // Mismo criterio que en `FormularioNotaCredito`: la fija manda sobre lo que
  // quedó en el estado de una apertura anterior.
  const [elegidaAMano, setElegidaAMano] =
    useState<VentaDocumentoResumen | null>(null);
  const factura = facturaFija ?? elegidaAMano;
  const [fecha] = useState(hoyEnColombia());
  const [motivo, setMotivo] = useState("");
  const [lineas, setLineas] = useState<LineaVentaBorrador[]>([
    lineaVentaVacia(),
  ]);

  const limpiar = () => {
    setElegidaAMano(null);
    setMotivo("");
    setLineas([lineaVentaVacia()]);
  };

  const impedimento = (): string | null => {
    if (factura === null) return "Elija la factura sobre la que va a cobrar.";
    if (motivo.trim().length < 3)
      return "Indique por qué se cobra de más. Es lo primero que lee quien audita.";
    if (lineas.some((l) => l.producto === null))
      return "Cada línea necesita un producto.";
    if (lineas.some((l) => Number(l.cantidad) <= 0))
      return "Cada línea necesita una cantidad mayor a cero.";
    if (lineas.some((l) => Number(l.precioUnitario) <= 0))
      return "Cada línea necesita el valor que se cobra.";
    return null;
  };

  const problema = impedimento();

  const enviar = () => {
    if (problema !== null || factura === null) return;
    onGuardar({
      documentoOrigenId: factura.id,
      fecha,
      motivo: motivo.trim(),
      lineas: lineas.map((l) => ({
        productoId: l.producto!.id,
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario),
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
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>Nota débito</DialogTitle>
            <DialogDescription>
              Sube lo que el cliente debe sobre una factura ya emitida. No
              mueve inventario: no sale ni entra mercancía.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          <Campo id="factura" etiqueta="Factura sobre la que se cobra" escala="grande">
            {facturaFija ? (
              <p className="flex h-11 items-center rounded-xl border border-border bg-muted px-4 text-sm">
                {facturaFija.prefijo ?? ""}
                {facturaFija.consecutivo}
              </p>
            ) : (
              <SelectorFacturaVigente
                valor={factura}
                onElegir={setElegidaAMano}
              />
            )}
          </Campo>

          <Campo
            id="fecha"
            etiqueta="Fecha"
            escala="grande"
            ayuda="Un documento fiscal se emite el día que se emite: no se atrasa ni se adelanta."
          >
            <p
              id="fecha"
              className="flex h-11 items-center rounded-xl border border-border bg-muted/40 px-4 text-sm font-medium"
            >
              {formatFecha(fecha)}
            </p>
          </Campo>

          <Campo id="motivo" etiqueta="Motivo *" escala="grande">
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Flete no cobrado en la factura"
              className="min-h-24 rounded-xl px-4 py-3"
            />
          </Campo>

          <div>
            <p className="mb-3 text-sm font-semibold">Qué se cobra</p>
            <EditorLineasVenta
              lineas={lineas}
              onCambiar={setLineas}
              precioSiempreDigitado
              mostrarExistencia={false}
            />
          </div>
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <p className="self-center text-sm text-muted-foreground">
            {problema ?? "Listo para emitir."}
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
              Emitir nota débito
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
