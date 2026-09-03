"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Lock, Unlock } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AccionesFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { formatFecha } from "@/lib/utils";
import type { PeriodoContable } from "../types/periodos.types";

export interface AccionesPeriodo {
  onCerrar: (periodo: PeriodoContable) => void;
  onReabrir: (periodo: PeriodoContable) => void;
  puedeCerrar: boolean;
  puedeReabrir: boolean;
}

export function crearColumnasPeriodos(acciones: AccionesPeriodo): ColumnDef<PeriodoContable, unknown>[] {
  return [
    {
      accessorKey: "nombre",
      header: "Período",
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">
          {row.original.nombre}
        </span>
      ),
    },
    {
      id: "rango",
      header: "Rango",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatFecha(row.original.fechaInicio)} → {formatFecha(row.original.fechaFin)}
        </span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => <StatusBadge estado={row.original.estado} />,
    },
    {
      id: "cierre",
      header: "Cierre",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground/70">
          {row.original.cerradoAt ? formatFecha(row.original.cerradoAt) : "—"}
        </span>
      ),
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const periodo = row.original;
        const cerrado = periodo.estado === "CERRADO";
        const lista: AccionFila[] = [];
        if (acciones.puedeCerrar && !cerrado) {
          lista.push({
            label: "Cerrar período",
            icon: Lock,
            onSelect: () => acciones.onCerrar(periodo),
          });
        }
        if (acciones.puedeReabrir && cerrado) {
          lista.push({
            label: "Reabrir período",
            icon: Unlock,
            onSelect: () => acciones.onReabrir(periodo),
          });
        }
        if (lista.length === 0) {
          return null;
        }
        return <AccionesFila acciones={lista} />;
      },
    },
  ];
}
