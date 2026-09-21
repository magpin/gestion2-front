"use client";

import { useState } from "react";

import { cn, formatCOP, formatFecha } from "@/lib/utils";
import type { ModoRegla, ReglaAutonoma } from "../types/autonomia.types";
import { BotonTarjeta } from "./Piezas";

const QUE = {
  COBRO: { titulo: "Cobro de factura", detalle: "El cobro de una factura emitida, por su saldo o una parte" },
  PAGO: { titulo: "Pago a proveedor", detalle: "El pago de una compra" },
} as const;

/**
 * Una fila de «Hasta dónde llega»: una acción, su modo, su límite y sus
 * aciertos. Del prototipo `docs/asistente-ia-diseno/Autonomia.dc.html`.
 *
 * - **Todo arranca en «Solo proponer».** «Confirmar si pasa todo» se habilita
 *   cuando hay historia: la columna de aciertos es la que dice si soltarla.
 * - Quien no puede editar ve lo mismo, sin controles.
 */
export function FilaRegla({
  regla,
  puedeEditar,
  historiaMinima,
  guardando,
  alGuardar,
}: {
  regla: ReglaAutonoma;
  puedeEditar: boolean;
  historiaMinima: number;
  guardando: boolean;
  alGuardar: (modo: ModoRegla, limite?: number) => void;
}) {
  const [modo, setModo] = useState<ModoRegla>(regla.modo);
  const [limite, setLimite] = useState(regla.limite === null ? "" : String(regla.limite));
  const limiteNumero = Number(limite.replace(/\./g, "").replace(",", "."));
  const cambio =
    modo !== regla.modo || (modo === "CONFIRMAR_SI_PASA" && limiteNumero !== regla.limite);
  const valido = modo === "SOLO_PROPONER" || (Number.isFinite(limiteNumero) && limiteNumero > 0);
  const { confirmadas, sinCorregir, automaticas } = regla.aciertos;
  const faltan = Math.max(historiaMinima - confirmadas, 0);

  return (
    <div className="flex flex-col gap-3 border-b border-muted py-4 last:border-b-0 md:flex-row md:items-start md:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5 md:w-60">
        <span className="text-sm font-medium">{QUE[regla.accion].titulo}</span>
        <span className="text-xs text-muted-foreground">{QUE[regla.accion].detalle}</span>
        {regla.activadaPor !== null && regla.desde !== null && (
          <span className="text-xs text-muted-foreground">
            Cambiada por {regla.activadaPor} el {formatFecha(regla.desde)}
          </span>
        )}
      </div>

      <div className="flex grow flex-col gap-2">
        <div role="radiogroup" aria-label={`Modo de ${QUE[regla.accion].titulo}`} className="flex flex-wrap gap-2">
          {(["SOLO_PROPONER", "CONFIRMAR_SI_PASA"] as const).map((m) => {
            const bloqueado = m === "CONFIRMAR_SI_PASA" && !regla.hayHistoria && regla.modo !== m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={modo === m}
                disabled={!puedeEditar || bloqueado}
                onClick={() => setModo(m)}
                className={cn(
                  "h-8 rounded-md border px-3 text-[13px] disabled:opacity-50",
                  modo === m ? "border-foreground bg-muted font-medium" : "border-input bg-card",
                )}
              >
                {m === "SOLO_PROPONER" ? "Solo proponer" : "Confirmar si pasa todo"}
              </button>
            );
          })}
        </div>

        {modo === "CONFIRMAR_SI_PASA" && (
          <label className="flex items-center gap-2 text-[13px]">
            <span className="text-muted-foreground">Hasta</span>
            {puedeEditar ? (
              <input
                aria-label="Límite por documento"
                inputMode="decimal"
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                className="h-8 w-36 rounded-md border border-input bg-card px-2 text-right tabular-nums"
              />
            ) : (
              <span className="tabular-nums">{formatCOP(regla.limite)}</span>
            )}
            <span className="text-muted-foreground">por documento</span>
          </label>
        )}

        {!regla.hayHistoria && (
          <span className="text-xs text-muted-foreground">
            Para soltarla faltan {faltan} {faltan === 1 ? "confirmada" : "confirmadas"} por una persona
            (hacen falta {historiaMinima}).
          </span>
        )}

        {puedeEditar && cambio && (
          <div>
            <BotonTarjeta
              principal
              disabled={!valido || guardando}
              onClick={() => alGuardar(modo, modo === "CONFIRMAR_SI_PASA" ? limiteNumero : undefined)}
            >
              {guardando ? "Guardando…" : "Guardar"}
            </BotonTarjeta>
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-0.5 md:w-40 md:items-end">
        <span className="text-xs text-muted-foreground">Aciertos</span>
        <span className="text-sm font-medium tabular-nums">
          {sinCorregir}/{confirmadas}
        </span>
        <span className="text-xs text-muted-foreground">sin corregir</span>
        {automaticas > 0 && (
          <span className="text-xs text-muted-foreground">
            {automaticas} {automaticas === 1 ? "registrada sola" : "registradas solas"}
          </span>
        )}
      </div>
    </div>
  );
}
