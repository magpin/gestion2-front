"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Eye } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MenuFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { formatCOP, formatFecha } from "@/lib/utils";
import { MEDIOS_PAGO, estadoDeAbono, type Abono } from "../types/caja.types";

const LABEL_MEDIO = new Map(MEDIOS_PAGO.map((medio) => [medio.id, medio.label]));

export interface AccionesAbono {
  onVerDocumento: (abono: Abono) => void;
  onAnular: (abono: Abono) => void;
  /** Nombre del tercero por id: el abono trae `terceroId`, no el tercero entero. */
  nombreTercero: (terceroId: string) => string;
  puedeAnular: boolean;
}

export function crearColumnasAbonos(acciones: AccionesAbono): ColumnDef<Abono, unknown>[] {
  return [
    {
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatFecha(row.original.fecha)}</span>
      ),
    },
    {
      id: "tercero",
      header: "Tercero",
      accessorFn: (fila) => fila.terceroId,
      cell: ({ row }) => (
        <p className="truncate text-sm text-foreground">
          {acciones.nombreTercero(row.original.terceroId)}
        </p>
      ),
    },
    {
      id: "estado",
      header: "Sentido",
      accessorFn: (fila) => estadoDeAbono(fila),
      cell: ({ row }) => <StatusBadge estado={estadoDeAbono(row.original)} />,
    },
    {
      accessorKey: "origenTipo",
      header: "Documento",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.origenTipo === "VENTA" ? "Venta" : "Compra"}
        </span>
      ),
    },
    {
      accessorKey: "medioPago",
      header: "Medio",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {LABEL_MEDIO.get(row.original.medioPago) ?? row.original.medioPago}
          {row.original.referencia ? ` · ${row.original.referencia}` : ""}
        </span>
      ),
    },
    {
      id: "importe",
      header: "Importe",
      accessorFn: (fila) => fila.importe,
      cell: ({ row }) => (
        <span
          className={
            row.original.anulado
              ? "font-mono text-sm text-muted-foreground/70 line-through"
              : "font-mono text-sm font-semibold text-foreground"
          }
        >
          {formatCOP(row.original.importe)}
        </span>
      ),
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const abono = row.original;
        const lista: AccionFila[] = [
          {
            label: abono.origenTipo === "VENTA" ? "Ver la venta" : "Ver la compra",
            icon: Eye,
            onSelect: () => acciones.onVerDocumento(abono),
          },
        ];
        if (acciones.puedeAnular && !abono.anulado) {
          lista.push({
            label: "Anular",
            icon: Ban,
            variant: "destructive",
            separadorAntes: true,
            onSelect: () => acciones.onAnular(abono),
          });
        }
        return <MenuFila acciones={lista} />;
      },
    },
  ];
}
