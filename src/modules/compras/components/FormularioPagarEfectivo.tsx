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
import { SelectorCaja } from "@/modules/tesoreria/components/SelectorCaja";
import type { CajaResumen } from "@/modules/tesoreria/types/tesoreria.types";
import { formatCOP } from "@/lib/utils";
import type { CompraDocumentoResumen, PagarEfectivoInput } from "../types/compras.types";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Paga en efectivo, total o parcialmente. `compra` viene fija —se abre
 * desde una fila ya elegida—; el valor arranca en el saldo pendiente
 * (`neto_a_pagar - monto_pagado`), editable para dejar un abono.
 *
 * Mismo patrón que `FormularioCobrarEfectivo` de Ventas: `Contenido` monta
 * con `key={compra.id}` para que el estado arranque de cero en cada
 * compra, sin un efecto que sincronice nada.
 */
export function FormularioPagarEfectivo({
  compra,
  onCerrar,
  onGuardar,
  guardando,
}: {
  compra: CompraDocumentoResumen | null;
  onCerrar: () => void;
  onGuardar: (datos: PagarEfectivoInput) => void;
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
  onGuardar: (datos: PagarEfectivoInput) => void;
  guardando: boolean;
}) {
  const saldoPendiente = Number(compra.neto_a_pagar) - Number(compra.monto_pagado);

  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [valor, setValor] = useState(saldoPendiente);

  const impedimento = (): string | null => {
    if (caja === null) return "Elegí la caja que entrega la plata.";
    if (fecha === "") return "Elegí la fecha.";
    if (valor <= 0) return "El valor tiene que ser mayor a cero.";
    if (valor > saldoPendiente) return "No podés pagar más de lo que falta.";
    return null;
  };

  const problema = impedimento();

  const enviar = () => {
    if (problema !== null || caja === null) return;
    onGuardar({ cajaId: caja.id, fecha, valor });
  };

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle>Pagar en efectivo</DialogTitle>
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
        <Campo id="caja" etiqueta="Caja *" escala="grande">
          <SelectorCaja valor={caja} onElegir={setCaja} />
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="fecha" etiqueta="Fecha *" escala="grande">
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>

          <Campo id="valor" etiqueta="Valor a pagar *" escala="grande">
            <Input
              id="valor"
              type="number"
              min="0.01"
              max={saldoPendiente}
              step="0.01"
              value={valor}
              onChange={(e) => setValor(Number(e.target.value))}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
        </div>
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
