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
import { SelectorFacturaVigente } from "./SelectorFacturaVigente";
import type { CrearNotaCreditoInput, VentaDocumentoResumen } from "../types/ventas.types";

/**
 * Nota crédito: reversa una factura EMITIDA completa. Sin líneas que
 * editar acá — se copian tal cual de la factura, mismo producto y
 * cantidad; lo único que se pide es cuál factura y por qué.
 *
 * `facturaFija`, cuando viene, la deja sin cambiar y sin buscador: es el
 * caso de abrir esto desde el detalle de una factura ya elegida.
 */
export function FormularioNotaCredito({
  abierto,
  onCerrar,
  onGuardar,
  guardando,
  facturaFija,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (datos: CrearNotaCreditoInput) => void;
  guardando: boolean;
  facturaFija?: VentaDocumentoResumen;
}) {
  // `facturaFija` puede cambiar sin que este diálogo se desmonte —el mismo
  // formulario se reabre desde filas distintas de la lista de facturas—, así
  // que la elegida es la fija cuando viene, nunca lo que quedó en el estado
  // de una apertura anterior.
  const [elegidaAMano, setElegidaAMano] = useState<VentaDocumentoResumen | null>(
    null,
  );
  const factura = facturaFija ?? elegidaAMano;
  const [fecha, setFecha] = useState(hoyEnColombia());
  const [motivo, setMotivo] = useState("");

  const limpiar = () => {
    setElegidaAMano(null);
    setFecha(hoyEnColombia());
    setMotivo("");
  };

  const impedimento = (): string | null => {
    if (factura === null) return "Elegí la factura que vas a corregir.";
    if (fecha === "") return "Elegí la fecha.";
    if (motivo.trim().length < 3)
      return "Contá por qué se corrige esta factura. Es lo primero que lee quien audita.";
    return null;
  };

  const problema = impedimento();

  const enviar = () => {
    if (problema !== null || factura === null) return;
    onGuardar({ documentoOrigenId: factura.id, fecha, motivo: motivo.trim() });
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
            <DialogTitle>Nota crédito</DialogTitle>
            <DialogDescription>
              Reversa la factura completa: mismo producto, misma cantidad. Si
              la mercancía vuelve a bodega, se registra aparte como ajuste de
              inventario.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          <Campo id="factura" etiqueta="Factura a corregir" escala="grande">
            {facturaFija ? (
              <p className="flex h-11 items-center rounded-xl border border-border bg-muted px-4 text-sm">
                {facturaFija.prefijo ?? ""}
                {facturaFija.consecutivo}
              </p>
            ) : (
              <SelectorFacturaVigente valor={factura} onElegir={setElegidaAMano} />
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
              placeholder="Devolución por producto defectuoso"
              className="min-h-24 rounded-xl px-4 py-3"
            />
          </Campo>
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
              Emitir nota crédito
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
