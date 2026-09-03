"use client";

import { cn, formatCOP, formatFecha } from "@/lib/utils";
import { ETIQUETA_MOVIMIENTO, type MovimientoKardex } from "../types/productos.types";

// El sentido lo da el SIGNO de la cantidad, no el tipo: el ajuste por conteo
// entra o sale según lo que diga la bodega, y es el mismo tipo en los dos casos.
const entra = (m: MovimientoKardex) => Number(m.cantidad) > 0;

interface KardexTableProps {
  movimientos: MovimientoKardex[];
}

export function KardexTable({ movimientos }: KardexTableProps) {
  if (movimientos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground/70">Sin movimientos de kardex.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground/70">
            <th className="pb-2 font-medium">Fecha</th>
            <th className="pb-2 font-medium">Movimiento</th>
            <th className="pb-2 font-medium">Origen</th>
            <th className="pb-2 text-right font-medium">Cantidad</th>
            <th className="pb-2 text-right font-medium">Costo unit.</th>
            <th className="pb-2 text-right font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((movimiento) => {
            const entrada = entra(movimiento);
            return (
              <tr key={movimiento.id} className="border-t border-border">
                <td className="py-2 text-muted-foreground">
                  {formatFecha(movimiento.fecha)}
                </td>
                <td className="py-2">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      entrada
                        ? "text-success"
                        : "text-destructive",
                    )}
                  >
                    {ETIQUETA_MOVIMIENTO[movimiento.tipo]}
                  </span>
                </td>
                <td className="py-2 text-muted-foreground/70">{movimiento.origenTipo}</td>
                <td
                  className={cn(
                    "py-2 text-right font-mono",
                    entrada
                      ? "text-success"
                      : "text-destructive",
                  )}
                >
                  {entrada ? "+" : "−"}
                  {Number(movimiento.cantidad)}
                </td>
                <td className="py-2 text-right font-mono text-muted-foreground">
                  {formatCOP(Number(movimiento.costoUnitario))}
                </td>
                <td className="py-2 text-right font-mono font-medium text-foreground">
                  {Number(movimiento.saldoCantidad)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
