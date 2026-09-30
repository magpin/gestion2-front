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
import type { CobrarInput, VentaDocumentoResumen } from "../types/ventas.types";

/** Cobrar lo que se debe, o devolver lo que se cobró de más. */
export type ModoCobro = "COBRAR" | "DEVOLVER";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Cobra una factura, total o parcialmente, **repartida entre uno o varios
 * medios**. `factura` viene fija —se abre desde una fila ya elegida—; el
 * primer renglón arranca con el `pendiente` que manda la API —el saldo
 * efectivo menos lo cobrado—, editable para dejar un abono en vez de saldar
 * del todo.
 *
 * Con `modo="DEVOLVER"` es el mismo acto al revés (paso 13 de
 * `ventas-ajustes.md`): la plata sale de la caja o del banco y la factura
 * sigue valiendo lo mismo. El tope es lo cobrado, y el primer renglón arranca
 * con el saldo a favor del cliente si lo hay.
 *
 * El contenido vive en `Contenido`, montado con `key={factura.id}`: así el
 * estado (renglones, fecha) arranca de cero cada vez que se abre para una
 * factura distinta, sin un efecto que sincronice nada.
 */
export function FormularioCobro({
  factura,
  modo = "COBRAR",
  onCerrar,
  onGuardar,
  guardando,
}: {
  factura: VentaDocumentoResumen | null;
  modo?: ModoCobro;
  onCerrar: () => void;
  onGuardar: (datos: CobrarInput) => void;
  guardando: boolean;
}) {
  return (
    <Dialog open={factura !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {factura && (
          <Contenido
            key={`${modo}-${factura.id}`}
            factura={factura}
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
  factura,
  modo,
  onCerrar,
  onGuardar,
  guardando,
}: {
  factura: VentaDocumentoResumen;
  modo: ModoCobro;
  onCerrar: () => void;
  onGuardar: (datos: CobrarInput) => void;
  guardando: boolean;
}) {
  // Lo calcula la API: con notas crédito o débito encima, `total` dejó de ser
  // lo que el cliente debe.
  const saldoPendiente = Number(factura.pendiente);
  const devolver = modo === "DEVOLVER";
  const cobrado = Number(factura.monto_pagado);
  const aFavor = Number(factura.saldo_a_favor);
  // Se devuelve contra lo cobrado, no contra el saldo: es plata que entró, y
  // lo que la factura vale hoy no cambia esa cuenta (`calcularDevolucionCobro`).
  const tope = devolver ? cobrado : saldoPendiente;

  const [fecha, setFecha] = useState(hoy());
  // El primer renglón arranca por el pendiente entero: cobrar todo de un medio
  // es el caso corriente, y repartir es la excepción que alguien pide.
  const [renglones, setRenglones] = useState<RenglonPagoBorrador[]>([
    renglonPagoVacio(devolver ? (aFavor > 0 ? String(aFavor) : "") : String(saldoPendiente)),
  ]);

  const problema =
    fecha === ""
      ? "Elegí la fecha."
      : problemaDe(renglones, tope, devolver ? "devolver" : "cobrar");

  const enviar = () => {
    if (problema !== null) return;
    onGuardar({ fecha, pagos: aPagos(renglones) });
  };

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>{devolver ? "Devolver al cliente" : "Cobrar"}</DialogTitle>
          <DialogDescription>
            {factura.prefijo ?? ""}
            {factura.consecutivo} ·{" "}
            {devolver ? (
              <>
                Cobrado:{" "}
                <span className="font-mono font-semibold">{formatCOP(cobrado)}</span>
                {aFavor > 0 && (
                  <>
                    {" "}· Saldo a favor del cliente:{" "}
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
            La plata sale de la caja o del banco y la factura sigue valiendo lo mismo. Si el
            cliente devolvió producto o hay que bajarle el valor, lo que va es una nota
            crédito. Una caja no puede quedar en negativo; un banco sí. Por banco, el 4×1000
            lo asume el cliente: sale de lo que se le devuelve.
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
          cajaFija
          renglones={renglones}
          onCambiar={setRenglones}
          tope={tope}
          soloExceso={devolver}
        />
      </DialogBody>

      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {problema ?? (devolver ? "Listo para devolver." : "Listo para cobrar.")}
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
            {devolver ? "Devolver" : "Cobrar"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
