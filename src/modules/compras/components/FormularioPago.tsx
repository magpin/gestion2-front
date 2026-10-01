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
import {
  aPagos,
  EditorMediosPago,
  problemaDe,
  renglonPagoVacio,
  type RenglonPagoBorrador,
} from "@/modules/tesoreria/components/EditorMediosPago";
import { formatCOP } from "@/lib/utils";
import type { CompraDocumentoResumen, PagarInput } from "../types/compras.types";

/** Pagar lo que se debe, o registrar lo que el proveedor nos devuelve. */
export type ModoPago = "PAGAR" | "DEVOLVER";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Paga una compra, total o parcialmente, **repartida entre uno o varios
 * medios**. `compra` viene fija —se abre desde una fila ya elegida—; el primer
 * renglón arranca con el `pendiente` que manda la API —el neto efectivo menos
 * lo pagado—, editable para dejar un abono.
 *
 * Con `modo="DEVOLVER"` el proveedor nos devuelve plata: entra a la caja o al
 * banco y la compra sigue valiendo lo mismo. Espejo de `FormularioCobro`.
 *
 * Mismo patrón que `FormularioCobro` de Ventas: `Contenido` monta con
 * `key={compra.id}` para que el estado arranque de cero en cada compra, sin
 * un efecto que sincronice nada.
 */
export function FormularioPago({
  compra,
  modo = "PAGAR",
  onCerrar,
  onGuardar,
  guardando,
}: {
  compra: CompraDocumentoResumen | null;
  modo?: ModoPago;
  onCerrar: () => void;
  onGuardar: (datos: PagarInput) => void;
  guardando: boolean;
}) {
  return (
    <Dialog open={compra !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {compra && (
          <Contenido
            key={`${modo}-${compra.id}`}
            compra={compra}
            modo={modo}
            onCerrar={onCerrar}
            onGuardar={onGuardar}
            guardando={guardando}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  compra,
  modo,
  onCerrar,
  onGuardar,
  guardando,
}: {
  compra: CompraDocumentoResumen;
  modo: ModoPago;
  onCerrar: () => void;
  onGuardar: (datos: PagarInput) => void;
  guardando: boolean;
}) {
  // Lo calcula la API, igual que en el cobro: las notas del proveedor mueven
  // lo que se le debe.
  const saldoPendiente = Number(compra.pendiente);
  const devolver = modo === "DEVOLVER";
  const pagado = Number(compra.monto_pagado);
  const aFavor = Number(compra.saldo_a_favor);
  // Contra lo pagado, no contra el saldo: mismo criterio que la devolución de un cobro.
  const tope = devolver ? pagado : saldoPendiente;

  const [fecha, setFecha] = useState(hoy());
  const [renglones, setRenglones] = useState<RenglonPagoBorrador[]>([
    renglonPagoVacio(devolver ? (aFavor > 0 ? String(aFavor) : "") : String(saldoPendiente)),
  ]);

  const problema =
    fecha === ""
      ? "Elija la fecha."
      : problemaDe(renglones, tope, devolver ? "devolver" : "pagar");

  const enviar = () => {
    if (problema !== null) return;
    onGuardar({ fecha, pagos: aPagos(renglones) });
  };

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>{devolver ? "Devolución del proveedor" : "Pagar"}</DialogTitle>
          <DialogDescription>
            {compra.numero_factura_proveedor} ·{" "}
            {devolver ? (
              <>
                Pagado:{" "}
                <span className="font-mono font-semibold">{formatCOP(pagado)}</span>
                {aFavor > 0 && (
                  <>
                    {" "}· Saldo a nuestro favor:{" "}
                    <span className="font-mono font-semibold">{formatCOP(aFavor)}</span>
                  </>
                )}
              </>
            ) : (
              <>
                Saldo pendiente:{" "}
                <span className="font-mono font-semibold">
                  {formatCOP(saldoPendiente)}
                </span>
              </>
            )}
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-5">
        {devolver && (
          <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
            El dinero que devuelve el proveedor entra a la caja o al banco, y la compra sigue
            valiendo lo mismo. Si devolvimos mercancía o hay que bajarle el valor, lo que va
            es una nota crédito de compra.
          </p>
        )}

        <Campo id="fecha" etiqueta="Fecha *" escala="grande">
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="h-11 w-full rounded-xl px-4 sm:w-52"
          />
        </Campo>

        <EditorMediosPago
          renglones={renglones}
          onCambiar={setRenglones}
          tope={tope}
          soloExceso={devolver}
        />
      </DialogBody>

      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {problema ?? (devolver ? "Listo para registrar la devolución." : "Listo para pagar.")}
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
            {devolver ? "Registrar devolución" : "Pagar"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
