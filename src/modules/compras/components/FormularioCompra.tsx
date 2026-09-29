"use client";

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
import { useBorradorCompra, type InicioCompra } from "../hooks/useBorradorCompra";
import type { CrearCompraInput } from "../types/compras.types";
import { CamposCompra } from "./CamposCompra";

/**
 * Registrar una factura de compra en un diálogo: proveedor, el número que el
 * proveedor le puso a SU factura (dato externo, no lo numeramos nosotros),
 * fecha, líneas de producto/cantidad/costo, y retenciones opcionales.
 *
 * Sigue para «Registrar gasto» y la lectura de facturas; la compra nueva desde
 * Compras es la página (`/dashboard/compras/nueva`), con el mismo cuerpo.
 */
export function FormularioCompra({
  abierto,
  onCerrar,
  onGuardar,
  guardando,
  inicial,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (datos: CrearCompraInput) => void;
  guardando: boolean;
  /**
   * Con qué arranca: «Registrar gasto» en Gastos abre la compra con el
   * proveedor y la línea de gasto ya puestos. Se lee al montar.
   */
  inicial?: InicioCompra;
}) {
  const b = useBorradorCompra(inicial, abierto);

  const enviar = () => {
    const datos = b.datos();
    if (datos !== null) onGuardar(datos);
  };

  return (
    <Dialog
      open={abierto}
      onOpenChange={(a) => {
        if (!a) {
          onCerrar();
          b.limpiar();
        }
      }}
    >
      <DialogContent size="xl">
        <DialogHeader>
          <div>
            <DialogTitle>Nueva compra</DialogTitle>
            <DialogDescription>
              Asienta y aumenta el kardex al guardar. El costo de cada línea
              es el que dice la factura del proveedor.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody>
          <CamposCompra b={b} />
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          <p className="self-center text-sm text-muted-foreground">
            {b.problema ?? "Listo para guardar."}
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
              disabled={b.problema !== null || guardando}
              onClick={enviar}
            >
              {guardando && <Loader2 className="size-4 animate-spin" />}
              Registrar compra
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
