"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Eye, FileText } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MenuFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { formatCOP, formatFecha } from "@/lib/utils";
import { estadoDeVenta, type Venta } from "../types/ventas.types";

export interface AccionesVenta {
  onVer: (venta: Venta) => void;
  onFacturar: (venta: Venta) => void;
  onAnular: (venta: Venta) => void;
  /** Nombre del cliente por id: la venta trae `terceroId`, no el tercero entero. */
  nombreCliente: (terceroId: string) => string;
  puedeAnular: boolean;
}

export function crearColumnasVentas(acciones: AccionesVenta): ColumnDef<Venta, unknown>[] {
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
      accessorKey: "condicion",
      header: "Condición",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.condicion === "CONTADO" ? "Contado" : "Crédito"}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      accessorFn: (fila) => estadoDeVenta(fila),
      cell: ({ row }) => <StatusBadge estado={estadoDeVenta(row.original)} />,
    },
    {
      id: "saldo",
      header: "Saldo",
      accessorFn: (fila) => Number(fila.saldoPendiente),
      cell: ({ row }) => {
        const saldo = Number(row.original.saldoPendiente);
        return (
          <span
            className={
              saldo > 0
                ? "font-mono text-sm font-semibold text-warning"
                : "font-mono text-sm text-muted-foreground/70"
            }
          >
            {formatCOP(saldo)}
          </span>
        );
      },
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold text-foreground">
          {formatCOP(Number(row.original.total))}
        </span>
      ),
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const venta = row.original;
        const lista: AccionFila[] = [
          { label: "Ver detalle", icon: Eye, onSelect: () => acciones.onVer(venta) },
        ];
        if (!venta.anulada) {
          lista.push({
            label: "Emitir factura",
            icon: FileText,
            onSelect: () => acciones.onFacturar(venta),
          });
        }
        if (acciones.puedeAnular && !venta.anulada) {
          lista.push({
            label: "Anular",
            icon: Ban,
            variant: "destructive",
            separadorAntes: true,
            onSelect: () => acciones.onAnular(venta),
          });
        }
        return <MenuFila acciones={lista} />;
      },
    },
  ];
}
