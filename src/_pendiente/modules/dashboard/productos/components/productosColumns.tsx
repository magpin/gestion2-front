"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DollarSign, Eye, Pencil, Trash2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MenuFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { cn, formatCOP } from "@/lib/utils";
import { bajoCritico, type Producto } from "../types/productos.types";

export interface AccionesProducto {
  onVer: (producto: Producto) => void;
  onEditar: (producto: Producto) => void;
  onPrecioMinimo: (producto: Producto) => void;
  onUsarTaller: (producto: Producto) => void;
  onVerAplicaciones: (producto: Producto) => void;
  onEliminar: (producto: Producto) => void;
  puedeEliminar: boolean;
  puedeUsarTaller: boolean;
}

export function crearColumnasProductos(acciones: AccionesProducto): ColumnDef<Producto, unknown>[] {
  return [
    {
      header: "Referencia",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
        </span>
      ),
    },
    {
      accessorKey: "nombre",
      header: "Producto",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.nombre}
          </p>
          <p className="text-xs text-muted-foreground/70">
          </p>
        </div>
      ),
    },
    {
      header: "Tipo",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
        </span>
      ),
    },
    {
      accessorKey: "precioVenta",
      header: "Precio venta",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-foreground">
          {formatCOP(Number(row.original.precioVenta))}
        </span>
      ),
    },
    {
      id: "stock",
      header: "Stock",
      accessorFn: (fila) => Number(fila.stock),
      cell: ({ row }) => {
        const critico = bajoCritico(row.original);
        return (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono text-sm font-semibold",
                critico
                  ? "text-destructive"
                  : "text-foreground",
              )}
            >
              {Number(row.original.stock)}
            </span>
            <span className="text-xs text-muted-foreground/70">
            </span>
            {critico && (
              <Badge
                className="border border-danger/20 bg-danger/15 text-danger"
              >
                Crítico
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const producto = row.original;
        const lista: AccionFila[] = [
          { label: "Ver detalle", icon: Eye, onSelect: () => acciones.onVer(producto) },
          { label: "Editar", icon: Pencil, onSelect: () => acciones.onEditar(producto) },
          {
            label: "Editar precio mínimo",
            icon: DollarSign,
            onSelect: () => acciones.onPrecioMinimo(producto),
          },
        ];
        if (acciones.puedeUsarTaller) {
          lista.push({
            label: "Usar para el taller",
            icon: Wrench,
            onSelect: () => acciones.onUsarTaller(producto),
          });
        }
        if (acciones.puedeEliminar) {
          lista.push({
            label: "Eliminar",
            icon: Trash2,
            variant: "destructive",
            separadorAntes: true,
            onSelect: () => acciones.onEliminar(producto),
          });
        }
        return <MenuFila acciones={lista} />;
      },
    },
  ];
}
