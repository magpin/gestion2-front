"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PucCuenta } from "../types/puc.types";

export function crearColumnasPuc(): ColumnDef<PucCuenta, unknown>[] {
  return [
    {
      accessorKey: "codigo",
      header: "Código",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-foreground">
          {row.original.codigo}
        </span>
      ),
    },
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{row.original.nombre}</span>
      ),
    },
    {
      accessorKey: "naturaleza",
      header: "Naturaleza",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.naturaleza === "DEBITO"
            ? "Débito"
            : row.original.naturaleza === "CREDITO"
              ? "Crédito"
              : row.original.naturaleza}
        </span>
      ),
    },
    {
      accessorKey: "nivel",
      header: "Nivel",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground/70">
          {row.original.nivel}
        </span>
      ),
    },
    {
      accessorKey: "transaccional",
      header: "Tipo",
      cell: ({ row }) =>
        row.original.transaccional ? (
          <Badge
            className={cn(
              "border px-2 py-0.5 text-xs",
              "border-success/20 bg-success/15 text-success",
            )}
          >
            Transaccional
          </Badge>
        ) : (
          <Badge
            className={cn(
              "border px-2 py-0.5 text-xs",
              "border-muted-foreground/20 bg-muted-foreground/15 text-muted-foreground",
            )}
          >
            Agrupadora
          </Badge>
        ),
    },
  ];
}
