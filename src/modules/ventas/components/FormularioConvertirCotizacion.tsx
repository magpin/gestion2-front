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
import { formatFecha, hoyEnColombia } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import type {
  ConvertirCotizacionInput,
  VentaDocumentoResumen,
} from "../types/ventas.types";

/**
 * Convertir una cotización en factura: solo pide la fecha. El cliente y las
 * líneas ya están en la cotización — no se vuelven a digitar. El precio de
 * cada línea se recalcula contra el vigente al momento de facturar, no el
 * que tenía la cotización cuando se hizo.
 */
export function FormularioConvertirCotizacion({
  cotizacion,
  onCerrar,
  onGuardar,
  guardando,
}: {
  cotizacion: VentaDocumentoResumen | null;
  onCerrar: () => void;
  onGuardar: (datos: ConvertirCotizacionInput) => void;
  guardando: boolean;
}) {
  const [fecha, setFecha] = useState(hoyEnColombia());

  return (
    <Dialog
      open={cotizacion !== null}
      onOpenChange={(a) => {
        if (!a) {
          onCerrar();
          setFecha(hoyEnColombia());
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>
              Convertir {cotizacion?.prefijo ?? ""}
              {cotizacion?.consecutivo} en factura
            </DialogTitle>
            <DialogDescription>
              Numera contra la resolución DIAN vigente, asienta y descuenta
              el kardex al guardar — igual que cualquier factura. El precio
              de cada línea se toma vigente en esta fecha, no el que tenía
              la cotización.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody>
          <Campo
            id="fecha"
            etiqueta="Fecha de la factura"
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
        </DialogBody>

        <DialogFooter>
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
            disabled={fecha === "" || guardando}
            onClick={() => onGuardar({ fecha })}
          >
            {guardando && <Loader2 className="size-4 animate-spin" />}
            Emitir factura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
