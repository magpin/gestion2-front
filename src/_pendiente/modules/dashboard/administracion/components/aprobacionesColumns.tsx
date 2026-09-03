"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, PenLine } from "lucide-react";
import { AccionesFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { formatCOP, formatFecha } from "@/lib/utils";
import type { LineaPendienteAutorizacion } from "@/modules/dashboard/ventas/types/ventas.types";

export interface AccionesAprobacion {
  onFirmar: (linea: LineaPendienteAutorizacion) => void;
  onVerVenta: (linea: LineaPendienteAutorizacion) => void;
  /** Nombre del cliente por id: la línea trae `terceroId`. */
  nombreCliente: (terceroId: string) => string;
  /** Solo el director firma. El vendedor lee la bandeja para saber a quién llamar. */
  puedeFirmar: boolean;
}

export function crearColumnasAprobaciones(
  acciones: AccionesAprobacion,
): ColumnDef<LineaPendienteAutorizacion, unknown>[] {
  return [
    {
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatFecha(row.original.fecha)}</span>
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
      accessorKey: "producto",
      header: "Producto",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{row.original.producto}</p>
          <p className="text-xs text-muted-foreground/70">
            {row.original.cantidad} {row.original.cantidad === 1 ? "unidad" : "unidades"}
          </p>
        </div>
      ),
    },
    {
      id: "precio",
      header: "Precio vs. piso",
      accessorFn: (fila) => fila.precioUnitario,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-mono text-sm text-foreground">
            {formatCOP(row.original.precioUnitario)}
          </p>
          <p className="font-mono text-xs text-muted-foreground/70">
            piso {formatCOP(row.original.precioPiso)}
          </p>
        </div>
      ),
    },
    {
      id: "diferencia",
      header: "Se deja de ganar",
      accessorFn: (fila) => fila.diferencia,
      cell: ({ row }) => (
        // Es el dato de la decisión: cuánta plata cuesta firmar esta línea.
        <span className="font-mono text-sm font-semibold text-destructive">
          {formatCOP(row.original.diferencia)}
        </span>
      ),
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const linea = row.original;
        const lista: AccionFila[] = [
          {
            label: "Ver la venta",
            icon: Eye,
            onSelect: () => acciones.onVerVenta(linea),
          },
        ];
        if (acciones.puedeFirmar) {
          lista.unshift({
            label: "Firmar el precio",
            icon: PenLine,
            onSelect: () => acciones.onFirmar(linea),
          });
        }
        return <AccionesFila acciones={lista} />;
      },
    },
  ];
}
