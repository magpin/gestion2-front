"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MenuFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { cn } from "@/lib/utils";
import type { Tercero } from "../types/terceros.types";

export interface AccionesTercero {
  onVer: (tercero: Tercero) => void;
  onEditar: (tercero: Tercero) => void;
  onEliminar: (tercero: Tercero) => void;
  puedeEliminar: boolean;
}

const chip = "border px-2 py-0.5 text-xs";

export function crearColumnasTerceros(acciones: AccionesTercero): ColumnDef<Tercero, unknown>[] {
  return [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.nombre}
          </p>
          <p className="font-mono text-xs text-muted-foreground/70">
            {row.original.tipoDocumento} {row.original.numeroDocumento}
          </p>
        </div>
      ),
    },
    {
      id: "roles",
      header: "Tipo",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.esCliente && (
            <Badge
              className={cn(chip, "border-info/20 bg-info/15 text-info")}
            >
              Cliente
            </Badge>
          )}
          {row.original.esProveedor && (
            <Badge
              className={cn(
                chip,
                "border-info/20 bg-info/15 text-info",
              )}
            >
              Proveedor
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "contacto",
      header: "Contacto",
      cell: ({ row }) => (
        <div className="min-w-0 text-sm text-muted-foreground">
          <p className="truncate">{row.original.telefono ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground/70">
            {row.original.email ?? ""}
          </p>
        </div>
      ),
    },
    {
      header: "Municipio",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
        </span>
      ),
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const lista: AccionFila[] = [
          { label: "Ver detalle", icon: Eye, onSelect: () => acciones.onVer(row.original) },
          { label: "Editar", icon: Pencil, onSelect: () => acciones.onEditar(row.original) },
        ];
        if (acciones.puedeEliminar) {
          lista.push({
            label: "Eliminar",
            icon: Trash2,
            variant: "destructive",
            separadorAntes: true,
            onSelect: () => acciones.onEliminar(row.original),
          });
        }
        return <MenuFila acciones={lista} />;
      },
    },
  ];
}
