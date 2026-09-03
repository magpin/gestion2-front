"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AccionesFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { ROL_LABEL, type Usuario } from "../types/usuarios.types";

export interface AccionesUsuario {
  onEditar: (usuario: Usuario) => void;
  onResetPassword: (usuario: Usuario) => void;
  onEliminar: (usuario: Usuario) => void;
}

export function crearColumnasUsuarios(acciones: AccionesUsuario): ColumnDef<Usuario, unknown>[] {
  return [
    {
      accessorKey: "nombreCompleto",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.nombreCompleto}
          </p>
          <p className="truncate text-xs text-muted-foreground/70">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "rol",
      header: "RolCodigo",
      cell: ({ row }) => (
        <Badge
          className="border border-info/20 bg-info/15 px-2 py-0.5 text-xs text-info"
        >
          {row.original.roles.map((r) => ROL_LABEL.get(r) ?? r).join(" · ")}
        </Badge>
      ),
    },
    {
      accessorKey: "superAdmin",
      header: "",
      cell: ({ row }) =>
        row.original.superAdmin ? (
          <Badge
            className="border border-warning/20 bg-warning/15 px-2 py-0.5 text-xs text-warning"
          >
            Super admin
          </Badge>
        ) : null,
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const usuario = row.original;
        const lista: AccionFila[] = [
          { label: "Editar", icon: Pencil, onSelect: () => acciones.onEditar(usuario) },
          {
            label: "Resetear contraseña",
            icon: KeyRound,
            onSelect: () => acciones.onResetPassword(usuario),
          },
          {
            label: "Eliminar",
            icon: Trash2,
            variant: "destructive",
            separadorAntes: true,
            onSelect: () => acciones.onEliminar(usuario),
          },
        ];
        return <AccionesFila acciones={lista} />;
      },
    },
  ];
}
