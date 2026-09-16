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
 * Mismo patrón que `FormularioCobro` de Ventas: `Contenido` monta con
 * `key={compra.id}` para que el estado arranque de cero en cada compra, sin
 * un efecto que sincronice nada.
 */
export function FormularioPago({
  compra,
  onCerrar,
  onGuardar,
  guardando,
}: {
  compra: CompraDocumentoResumen | null;
  onCerrar: () => void;
  onGuardar: (datos: PagarInput) => void;
  guardando: boolean;
}) {
  return (
    <Dialog open={compra !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {compra && (
          <Contenido
            key={compra.id}
            compra={compra}
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
  onCerrar,
  onGuardar,
  guardando,
}: {
  compra: CompraDocumentoResumen;
  onCerrar: () => void;
  onGuardar: (datos: PagarInput) => void;
  guardando: boolean;
}) {
  // Lo calcula la API, igual que en el cobro: las notas del proveedor mueven
  // lo que se le debe.
  const saldoPendiente = Number(compra.pendiente);

  const [fecha, setFecha] = useState(hoy());
  const [renglones, setRenglones] = useState<RenglonPagoBorrador[]>([
    renglonPagoVacio(String(saldoPendiente)),
  ]);

  const problema =
    fecha === ""
      ? "Elegí la fecha."
      : problemaDe(renglones, saldoPendiente, "pagar");

  const enviar = () => {
    if (problema !== null) return;
    onGuardar({ fecha, pagos: aPagos(renglones) });
  };

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Pagar</DialogTitle>
          <DialogDescription>
            {compra.numero_factura_proveedor} · Saldo pendiente:{" "}
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
          {problema ?? "Listo para pagar."}
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
            Pagar
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
