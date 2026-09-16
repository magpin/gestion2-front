"use client";

import { useState } from "react";
import { Landmark, Loader2 } from "lucide-react";

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
import { SelectorCuentaBancaria } from "@/modules/tesoreria/components/SelectorCuentaBancaria";
import type { CajaResumen } from "@/modules/tesoreria/types/tesoreria.types";
import type { CuentaBancariaResumen } from "@/modules/tesoreria/types/bancos.types";
import { cn, formatCOP } from "@/lib/utils";
import type { CompraDocumentoResumen, PagarInput } from "../types/compras.types";

type Medio = "CAJA" | "BANCO";

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Paga una compra, total o parcialmente, por caja o por banco. `compra`
 * viene fija —se abre desde una fila ya elegida—; el valor arranca en el
 * `pendiente` que manda la API —el neto efectivo menos lo pagado—, editable
 * para dejar un abono.
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

  const [medio, setMedio] = useState<Medio>("CAJA");
  const [caja, setCaja] = useState<CajaResumen | null>(null);
  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [valor, setValor] = useState(saldoPendiente);

  const impedimento = (): string | null => {
    if (medio === "CAJA" && caja === null) return "Elegí la caja que entrega la plata.";
    if (medio === "BANCO" && cuenta === null) return "Elegí la cuenta que entrega la plata.";
    if (fecha === "") return "Elegí la fecha.";
    if (valor <= 0) return "El valor tiene que ser mayor a cero.";
    if (valor > saldoPendiente) return "No podés pagar más de lo que falta.";
    return null;
  };

  const problema = impedimento();

  const enviar = () => {
    if (problema !== null) return;
    if (medio === "CAJA" && caja !== null) {
      onGuardar({ medio: "CAJA", cajaId: caja.id, fecha, valor });
    } else if (medio === "BANCO" && cuenta !== null) {
      onGuardar({ medio: "BANCO", cuentaBancariaId: cuenta.id, fecha, valor });
    }
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
        <div className="inline-flex w-fit gap-1 rounded-2xl border border-border bg-muted p-1">
          {(["CAJA", "BANCO"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMedio(m)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                medio === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Landmark className="size-4" />
              {m === "CAJA" ? "Caja" : "Banco"}
            </button>
          ))}
        </div>

        {medio === "CAJA" ? (
          <Campo id="caja" etiqueta="Caja *" escala="grande">
            <SelectorCaja valor={caja} onElegir={setCaja} />
          </Campo>
        ) : (
          <Campo id="cuenta" etiqueta="Cuenta bancaria *" escala="grande">
            <SelectorCuentaBancaria valor={cuenta} onElegir={setCuenta} />
          </Campo>
        )}

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
