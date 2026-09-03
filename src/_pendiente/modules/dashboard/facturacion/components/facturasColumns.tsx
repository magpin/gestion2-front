"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, FileMinus, Printer } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MenuFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { formatFecha } from "@/lib/utils";
import { estadoDeFactura, type Factura } from "../types/facturacion.types";

export interface AccionesFactura {
  onImprimir: (factura: Factura) => void;
  onVerOrigen: (factura: Factura) => void;
  onNotaCredito: (factura: Factura) => void;
  /** Nombre del cliente por id: la factura trae `terceroId`, no el tercero entero. */
  nombreCliente: (terceroId: string) => string;
  puedeEmitirNota: boolean;
}

export function crearColumnasFacturas(
  acciones: AccionesFactura,
): ColumnDef<Factura, unknown>[] {
  return [
    {
      accessorKey: "numero",
      header: "Número",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium text-foreground">
          {row.original.numero}
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
      accessorKey: "origenTipo",
      header: "Origen",
      cell: ({ row }) => (
        // Un solo numerador para el mostrador y para el taller: por eso la
        // factura es polimórfica y esta columna existe.
        <span className="text-sm text-muted-foreground">
          {row.original.origenTipo === "VENTA" ? "Venta" : "Orden de trabajo"}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      accessorFn: (fila) => estadoDeFactura(fila),
      cell: ({ row }) => <StatusBadge estado={estadoDeFactura(row.original)} />,
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const factura = row.original;
        const lista: AccionFila[] = [
          {
            label: "Ver e imprimir",
            icon: Printer,
            onSelect: () => acciones.onImprimir(factura),
          },
          {
            label: factura.origenTipo === "VENTA" ? "Ver la venta" : "Ver la orden",
            icon: Eye,
            onSelect: () => acciones.onVerOrigen(factura),
          },
        ];
        // Sobre una factura ya anulada no hay nada más que devolver.
        if (acciones.puedeEmitirNota && !factura.anulada) {
          lista.push({
            label: "Emitir nota crédito",
            icon: FileMinus,
            separadorAntes: true,
            onSelect: () => acciones.onNotaCredito(factura),
          });
        }
        return <MenuFila acciones={lista} />;
      },
    },
  ];
}
