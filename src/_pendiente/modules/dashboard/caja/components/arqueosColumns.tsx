"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCOP, formatFecha } from "@/lib/utils";
import { resultadoDeArqueo } from "../lib/ciclo-caja";
import type { ArqueoCaja } from "../types/caja.types";

export function crearColumnasArqueos(): ColumnDef<ArqueoCaja, unknown>[] {
  return [
    {
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{formatFecha(row.original.fecha)}</span>
      ),
    },
    {
      id: "resultado",
      header: "Resultado",
      accessorFn: (fila) => resultadoDeArqueo(fila),
      cell: ({ row }) => <StatusBadge estado={resultadoDeArqueo(row.original)} />,
    },
    {
      id: "sistema",
      header: "Sistema",
      accessorFn: (fila) => fila.saldoSistema,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {formatCOP(row.original.saldoSistema)}
        </span>
      ),
    },
    {
      id: "contado",
      header: "Contado",
      accessorFn: (fila) => fila.saldoContado,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-foreground">
          {formatCOP(row.original.saldoContado)}
        </span>
      ),
    },
    {
      id: "diferencia",
      header: "Diferencia",
      accessorFn: (fila) => fila.diferencia,
      cell: ({ row }) => {
        const cuadra = resultadoDeArqueo(row.original) === "CUADRA";
        return (
          <span
            className={
              cuadra
                ? "font-mono text-sm text-muted-foreground/70"
                : "font-mono text-sm font-semibold text-destructive"
            }
          >
            {formatCOP(row.original.diferencia)}
          </span>
        );
      },
    },
    {
      id: "asiento",
      header: "Asiento",
      accessorFn: (fila) => (fila.asientoId === null ? "no" : "sí"),
      cell: ({ row }) => (
        // Un arqueo que cuadra es el único documento del esquema que puede no
        // tener asiento: es un hecho administrativo, no contable.
        <span className="text-sm text-muted-foreground">
          {row.original.asientoId === null ? "sin asiento" : "con asiento"}
        </span>
      ),
    },
  ];
}
