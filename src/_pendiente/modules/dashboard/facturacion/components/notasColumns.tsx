"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCOP, formatFecha } from "@/lib/utils";
import { MOTIVOS_NOTA, type NotaCredito } from "../types/facturacion.types";

const LABEL_MOTIVO = new Map(MOTIVOS_NOTA.map((motivo) => [motivo.id, motivo.label]));

export interface AccionesNota {
  /** Nombre del cliente por id: la nota trae `terceroId`. */
  nombreCliente: (terceroId: string) => string;
  /** Número de la factura corregida. Se resuelve con el listado ya cargado. */
  numeroFactura: (facturaId: string) => string;
}

export function crearColumnasNotas(acciones: AccionesNota): ColumnDef<NotaCredito, unknown>[] {
  return [
    {
      accessorKey: "numero",
      header: "Número",
      cell: ({ row }) => (
        // Segundo numerador, separado del de la factura: el rango que la DIAN
        // autoriza es para facturas de venta.
        <span className="font-mono text-sm font-medium text-foreground">
          {row.original.numero}
        </span>
      ),
    },
    {
      id: "factura",
      header: "Corrige",
      accessorFn: (fila) => fila.facturaId,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {acciones.numeroFactura(row.original.facturaId)}
        </span>
      ),
    },
    {
      id: "cliente",
      header: "Cliente",
      accessorFn: (fila) => fila.terceroId,
      cell: ({ row }) => (
        <p className="truncate text-sm text-foreground">
          {acciones.nombreCliente(row.original.terceroId)}
        </p>
      ),
    },
    {
      accessorKey: "fechaEmision",
      header: "Emitida",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatFecha(row.original.fechaEmision)}
        </span>
      ),
    },
    {
      accessorKey: "motivo",
      header: "Motivo",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {LABEL_MOTIVO.get(row.original.motivo) ?? row.original.motivo}
        </span>
      ),
    },
    {
      accessorKey: "alcance",
      header: "Alcance",
      cell: ({ row }) => <StatusBadge estado={row.original.alcance} />,
    },
    {
      id: "total",
      header: "Total",
      accessorFn: (fila) => fila.total,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCOP(row.original.total)}
        </span>
      ),
    },
  ];
}
