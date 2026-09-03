"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Send, ShoppingCart, ThumbsDown } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MenuFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { formatCOP, formatFecha } from "@/lib/utils";
import { sePuedeConvertir, sePuedeEditar, type Cotizacion } from "../types/cotizaciones.types";

export interface AccionesCotizacion {
  onVer: (cotizacion: Cotizacion) => void;
  onEditar: (cotizacion: Cotizacion) => void;
  onEnviar: (cotizacion: Cotizacion) => void;
  onRechazar: (cotizacion: Cotizacion) => void;
  onConvertir: (cotizacion: Cotizacion) => void;
  nombreCliente: (terceroId: string) => string;
}

export function crearColumnasCotizaciones(
  acciones: AccionesCotizacion,
): ColumnDef<Cotizacion, unknown>[] {
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
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatFecha(row.original.fecha)}</span>
      ),
    },
    {
      accessorKey: "validoHasta",
      header: "Vence",
      cell: ({ row }) => (
        <span
          className={
            row.original.vencida
              ? "text-sm font-medium text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {formatFecha(row.original.validoHasta)}
        </span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      accessorFn: (fila) => fila.estadoVisible,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge estado={row.original.estadoVisible} />
          {row.original.ventaId && <StatusBadge estado="CONVERTIDA" />}
        </div>
      ),
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
        const cotizacion = row.original;
        const lista: AccionFila[] = [
          { label: "Ver detalle", icon: Eye, onSelect: () => acciones.onVer(cotizacion) },
        ];
        if (sePuedeEditar(cotizacion)) {
          lista.push({
            label: "Editar",
            icon: Pencil,
            onSelect: () => acciones.onEditar(cotizacion),
          });
        }
        if (cotizacion.estado === "BORRADOR" && !cotizacion.ventaId) {
          lista.push({
            label: "Marcar enviada",
            icon: Send,
            onSelect: () => acciones.onEnviar(cotizacion),
          });
        }
        if (sePuedeConvertir(cotizacion)) {
          lista.push({
            label: "Convertir en venta",
            icon: ShoppingCart,
            onSelect: () => acciones.onConvertir(cotizacion),
          });
          lista.push({
            label: "Marcar rechazada",
            icon: ThumbsDown,
            variant: "destructive",
            separadorAntes: true,
            onSelect: () => acciones.onRechazar(cotizacion),
          });
        }
        return <MenuFila acciones={lista} />;
      },
    },
  ];
}
