"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Eye } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MenuFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { formatCOP, formatFecha } from "@/lib/utils";
import { estadoDeCompra, type Compra } from "../types/compras.types";

export interface AccionesCompra {
  onVer: (compra: Compra) => void;
  onAnular: (compra: Compra) => void;
  /** Nombre del proveedor por id: la compra trae `terceroId`, no el tercero entero. */
  nombreProveedor: (terceroId: string) => string;
  puedeAnular: boolean;
}

export function crearColumnasCompras(acciones: AccionesCompra): ColumnDef<Compra, unknown>[] {
  return [
    {
      accessorKey: "numeroFactura",
      header: "Factura",
      cell: ({ row }) => (
        // El número es del proveedor, no de la empresa: por eso no hay
        // consecutivo propio y dos proveedores pueden repetirlo.
        <span className="font-mono text-sm font-medium text-foreground">
          {row.original.numeroFactura}
        </span>
      ),
    },
    {
      id: "proveedor",
      header: "Proveedor",
      accessorFn: (fila) => fila.terceroId,
      cell: ({ row }) => (
        <p className="truncate text-sm text-foreground">
          {acciones.nombreProveedor(row.original.terceroId)}
        </p>
      ),
    },
    {
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatFecha(row.original.fecha)}</span>
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
      accessorFn: (fila) => estadoDeCompra(fila),
      cell: ({ row }) => <StatusBadge estado={estadoDeCompra(row.original)} />,
    },
    {
      id: "saldo",
      header: "Saldo",
      accessorFn: (fila) => fila.saldoPendiente,
      cell: ({ row }) => {
        const saldo = row.original.saldoPendiente;
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
          {formatCOP(row.original.total)}
        </span>
      ),
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const compra = row.original;
        const lista: AccionFila[] = [
          { label: "Ver detalle", icon: Eye, onSelect: () => acciones.onVer(compra) },
        ];
        // Pagarle al proveedor es de tesorería y tiene su pantalla: acá no
        // aparece la acción, porque este módulo no mueve plata.
        if (acciones.puedeAnular && !compra.anulada) {
          lista.push({
            label: "Anular",
            icon: Ban,
            variant: "destructive",
            separadorAntes: true,
            onSelect: () => acciones.onAnular(compra),
          });
        }
        return <MenuFila acciones={lista} />;
      },
    },
  ];
}
