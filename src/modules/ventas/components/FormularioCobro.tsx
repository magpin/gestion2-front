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
 * El contenido vive en `Contenido`, montado con `key={factura.id}`: así el
 * estado (renglones, fecha) arranca de cero cada vez que se abre para una
 * factura distinta, sin un efecto que sincronice nada.
 */
export function FormularioCobro({
  factura,
  onCerrar,
  onGuardar,
  guardando,
}: {
  factura: VentaDocumentoResumen | null;
  onCerrar: () => void;
  onGuardar: (datos: CobrarInput) => void;
  guardando: boolean;
}) {
  return (
    <Dialog open={factura !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {factura && (
          <Contenido
            key={factura.id}
            factura={factura}
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
  onCerrar,
  onGuardar,
  guardando,
}: {
  factura: VentaDocumentoResumen;
  onCerrar: () => void;
  onGuardar: (datos: CobrarInput) => void;
  guardando: boolean;
}) {
  // Lo calcula la API: con notas crédito o débito encima, `total` dejó de ser
  // lo que el cliente debe.
  const saldoPendiente = Number(factura.pendiente);

  const [fecha, setFecha] = useState(hoy());
  // El primer renglón arranca por el pendiente entero: cobrar todo de un medio
  // es el caso corriente, y repartir es la excepción que alguien pide.
  const [renglones, setRenglones] = useState<RenglonPagoBorrador[]>([
    renglonPagoVacio(String(saldoPendiente)),
  ]);

  const problema =
    fecha === ""
      ? "Elegí la fecha."
      : problemaDe(renglones, saldoPendiente, "cobrar");

  const enviar = () => {
    if (problema !== null) return;
    onGuardar({ fecha, pagos: aPagos(renglones) });
  };

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Cobrar</DialogTitle>
          <DialogDescription>
            {factura.prefijo ?? ""}
            {factura.consecutivo} · Saldo pendiente:{" "}
            <span className="font-mono font-semibold">
              {formatCOP(saldoPendiente)}
            </span>
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody className="flex flex-col gap-5">
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
          tope={saldoPendiente}
        />
      </DialogBody>

      <DialogFooter className="sm:justify-between">
        <p className="self-center text-sm text-muted-foreground">
          {problema ?? "Listo para cobrar."}
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
            Cobrar
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
