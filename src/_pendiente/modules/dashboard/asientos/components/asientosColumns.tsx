"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, ExternalLink, Undo2 } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MenuFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { Badge } from "@/components/ui/badge";
import { cn, formatCOP, formatFecha } from "@/lib/utils";
import {
  ORIGEN_LABEL,
  estadoDeAsiento,
  rutaDelOrigen,
  type Asiento,
} from "../types/asientos.types";

export interface AccionesAsiento {
  onVer: (asiento: Asiento) => void;
  onVerDocumento: (asiento: Asiento) => void;
  onVerReversa: (asiento: Asiento) => void;
}

/**
 * Un color por origen, para que la columna se lea de un vistazo sin leerla.
 *
 * El color acompaña a la palabra, nunca la reemplaza: la etiqueta dice el
 * origen igual en escala de grises.
 */
const COLOR_ORIGEN: Record<string, string> = {
  VENTA: "bg-success/15 text-success border-success/20",
  COMPRA: "bg-info/15 text-info border-info/20",
  ABONO: "bg-info/15 text-info border-info/20",
  NOTA_CREDITO: "bg-danger/15 text-danger border-danger/20",
  ARQUEO: "bg-info/15 text-info border-info/20",
  AJUSTE_INV: "bg-warning/15 text-warning border-warning/20",
  OT: "bg-cyan-500/15 text-cyan-700 border-cyan-500/20",
  ANTICIPO_OT: "bg-cyan-500/15 text-cyan-700 border-cyan-500/20",
  CIERRE: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/20",
};

export function crearColumnasAsientos(
  acciones: AccionesAsiento,
): ColumnDef<Asiento, unknown>[] {
  return [
    {
      accessorKey: "numero",
      header: "N°",
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {row.original.numero}
        </span>
      ),
    },
    {
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatFecha(row.original.fecha)}
        </span>
      ),
    },
    {
      id: "origen",
      header: "Origen",
      accessorFn: (fila) => ORIGEN_LABEL[fila.origenTipo] ?? fila.origenTipo,
      cell: ({ row }) => (
        <Badge
          className={cn(
            "whitespace-nowrap border px-2 py-0.5 text-xs font-medium",
            COLOR_ORIGEN[row.original.origenTipo] ??
              "border-muted-foreground/20 bg-muted-foreground/15 text-muted-foreground",
          )}
        >
          {ORIGEN_LABEL[row.original.origenTipo] ?? row.original.origenTipo}
        </Badge>
      ),
    },
    {
      accessorKey: "descripcion",
      header: "Concepto",
      cell: ({ row }) => (
        // `title` para que el texto largo se pueda leer entero sin abrir nada.
        <p
          className="max-w-[28rem] truncate text-sm text-foreground"
          title={row.original.descripcion ?? undefined}
        >
          {row.original.descripcion ?? "—"}
        </p>
      ),
    },
    {
      id: "valor",
      header: () => <div className="text-right">Valor</div>,
      accessorFn: (fila) => fila.totalDebito,
      cell: ({ row }) => (
        // Débito y crédito son iguales por definición —lo garantiza un CHECK—,
        // así que imprimir los dos sería decir el mismo número dos veces.
        <div
          className={cn(
            "text-right font-mono text-sm font-semibold tabular-nums",
            row.original.anulado
              ? "text-muted-foreground/70 line-through"
              : "text-foreground",
          )}
        >
          {formatCOP(row.original.totalDebito)}
        </div>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      accessorFn: (fila) => estadoDeAsiento(fila),
      cell: ({ row }) => <StatusBadge estado={estadoDeAsiento(row.original)} />,
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const asiento = row.original;
        const documento = rutaDelOrigen(asiento);

        const lista: AccionFila[] = [
          { label: "Ver el asiento", icon: BookOpen, onSelect: () => acciones.onVer(asiento) },
        ];

        // Solo `VENTA` y `COMPRA` tienen pantalla propia por id. Los demás
        // orígenes viven dentro de una pestaña, así que la opción no se ofrece
        // en vez de llevar a una ruta que no existe.
        if (documento) {
          lista.push({
            label: asiento.origenTipo === "VENTA" ? "Ver la venta" : "Ver la compra",
            icon: ExternalLink,
            onSelect: () => acciones.onVerDocumento(asiento),
          });
        }

        if (asiento.reversaDeId) {
          lista.push({
            label: "Ver el asiento reversado",
            icon: Undo2,
            onSelect: () => acciones.onVerReversa(asiento),
          });
        }

        return <MenuFila acciones={lista} />;
      },
    },
  ];
}
