"use client";

import { Card } from "@/components/ui/card";
import { formatCOP } from "@/lib/utils";
import type { ClienteTop } from "../types/dashboard.types";

interface TopClientesCardProps {
  clientes: ClienteTop[];
}

// Top 5 clientes por ventas del período.
export function TopClientesCard({ clientes }: TopClientesCardProps) {
  return (
    <Card className="gap-4 p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Top clientes del período
      </h2>

      {clientes.length === 0 ? (
        <p className="text-sm text-muted-foreground/70">
          Sin ventas registradas en el período.
        </p>
      ) : (
        <ul className="space-y-3">
          {clientes.map((cliente, indice) => (
            <li
              key={`${cliente.numeroDocumento}-${indice}`}
              className="flex items-center gap-3"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold text-muted-foreground">
                {indice + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {cliente.nombre}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {cliente.numTransacciones}{" "}
                  {cliente.numTransacciones === 1 ? "venta" : "ventas"}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
                {formatCOP(cliente.totalCompras)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
