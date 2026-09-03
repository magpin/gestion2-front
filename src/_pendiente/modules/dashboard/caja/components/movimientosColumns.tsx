"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCOP } from "@/lib/utils";
import type { MovimientoCaja, OrigenCaja } from "../types/caja.types";

/** El movimiento guarda hora, no solo día: es el orden en que pasó la plata. */
function formatHora(iso: string): string {
  return format(parseISO(iso), "dd MMM · HH:mm", { locale: es });
}

const ORIGEN: Record<OrigenCaja, string> = {
  ABONO: "Cobro o pago",
  ARQUEO: "Ajuste de arqueo",
  NOTA_CREDITO: "Nota crédito",
};

export function crearColumnasMovimientos(): ColumnDef<MovimientoCaja, unknown>[] {
  return [
    {
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatHora(row.original.fecha)}</span>
      ),
    },
    {
      accessorKey: "sentido",
      header: "Sentido",
      cell: ({ row }) => <StatusBadge estado={row.original.sentido} />,
    },
    {
      id: "origen",
      header: "Origen",
      accessorFn: (fila) => fila.origenTipo ?? "",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.origenTipo ? ORIGEN[row.original.origenTipo] : "—"}
        </span>
      ),
    },
    {
      accessorKey: "nota",
      header: "Nota",
      cell: ({ row }) => (
        <p className="truncate text-sm text-foreground">{row.original.nota ?? "—"}</p>
      ),
    },
    {
      id: "importe",
      header: "Importe",
      accessorFn: (fila) => fila.importe,
      cell: ({ row }) => {
        // La entrada y la salida se distinguen por el signo, no solo por el
        // color: la tabla se lee igual impresa en blanco y negro.
        const entra = row.original.sentido === "ENTRADA";
        return (
          <span
            className={
              entra
                ? "font-mono text-sm font-semibold text-success"
                : "font-mono text-sm font-semibold text-foreground"
            }
          >
            {entra ? "+" : "−"} {formatCOP(row.original.importe)}
          </span>
        );
      },
    },
  ];
}
