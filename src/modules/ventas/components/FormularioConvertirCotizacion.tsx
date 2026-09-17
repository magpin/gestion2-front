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
import { SelectorFormaPago } from "@/modules/tesoreria/components/SelectorFormaPago";
import {
  aFormaPago,
  formaPagoVacia,
  problemaFormaPago,
} from "@/modules/tesoreria/lib/formaPago";
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
  const [formaPago, setFormaPago] = useState(formaPagoVacia);
  const problema = problemaFormaPago(formaPago);

  return (
    <Dialog
      open={cotizacion !== null}
      onOpenChange={(a) => {
        if (!a) {
          onCerrar();
          setFecha(hoyEnColombia());
          setFormaPago(formaPagoVacia());
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

        <DialogBody className="flex flex-col gap-8">
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

          <SelectorFormaPago valor={formaPago} onCambiar={setFormaPago} />
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
              disabled={fecha === "" || problema !== null || guardando}
              onClick={() => onGuardar({ fecha, ...aFormaPago(formaPago) })}
            >
              {guardando && <Loader2 className="size-4 animate-spin" />}
              Emitir factura
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
