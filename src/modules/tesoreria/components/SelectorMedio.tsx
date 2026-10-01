"use client";

import { cn } from "@/lib/utils";
import type { CuentaBancariaResumen } from "../types/bancos.types";
import type { CajaResumen } from "../types/tesoreria.types";
import { CajaPrincipal } from "./CajaPrincipal";
import { SelectorCaja } from "./SelectorCaja";
import { SelectorCuentaBancaria } from "./SelectorCuentaBancaria";

export type Medio = "CAJA" | "BANCO";

/**
 * Por dónde entra o sale la plata: caja o banco, y cuál. Lo comparten el
 * recibo de caja, el comprobante de egreso y los movimientos sin factura.
 */
export function SelectorMedio({
  medio,
  onMedio,
  caja,
  onCaja,
  cuenta,
  onCuenta,
  cajaFija = false,
}: {
  medio: Medio;
  onMedio: (m: Medio) => void;
  caja: CajaResumen | null;
  onCaja: (c: CajaResumen) => void;
  cuenta: CuentaBancariaResumen | null;
  onCuenta: (c: CuentaBancariaResumen) => void;
  /** La caja no se elige: la principal (lo que entra por ventas). */
  cajaFija?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex w-fit gap-1 rounded-2xl border border-border bg-muted p-1">
        {(["CAJA", "BANCO"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMedio(m)}
            className={cn(
              "rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors",
              medio === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {m === "CAJA" ? "Caja" : "Banco"}
          </button>
        ))}
      </div>
      {medio === "CAJA" ? (
        cajaFija ? (
          <CajaPrincipal valor={caja} onElegir={onCaja} />
        ) : (
          <SelectorCaja valor={caja} onElegir={onCaja} />
        )
      ) : (
        <SelectorCuentaBancaria valor={cuenta} onElegir={onCuenta} />
      )}
    </div>
  );
}

/** Qué falta elegir del medio, o `null`. */
export function problemaDelMedio(
  medio: Medio,
  caja: CajaResumen | null,
  cuenta: CuentaBancariaResumen | null,
): string | null {
  if (medio === "CAJA" && caja === null) return "Elija la caja.";
  if (medio === "BANCO" && cuenta === null) return "Elija la cuenta bancaria.";
  return null;
}
