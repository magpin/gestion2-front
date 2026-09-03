"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, FileMinus, Printer } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MenuFila, cabeceraAcciones, type AccionFila } from "@/components/shared/AccionesFila";
import { Badge } from "@/components/ui/badge";
import { cn, formatCOP, formatFecha } from "@/lib/utils";
import { TIPO_LABEL, type DocumentoFiscal } from "../lib/documentos";

export interface AccionesDocumento {
  onImprimir: (documento: DocumentoFiscal) => void;
  onVerNota: (documento: DocumentoFiscal) => void;
  onIrAlOrigen: (documento: DocumentoFiscal) => void;
  onNotaCredito: (documento: DocumentoFiscal) => void;
  /** Nombre del tercero por id: el documento guarda el id, no el nombre. */
  nombreTercero: (terceroId: string) => string;
  puedeEmitirNota: boolean;
}

/** Un tono por tipo, para separar de un vistazo lo que emite la empresa de lo que recibe. */
const COLOR_TIPO: Record<string, string> = {
  VENTA: "bg-success/15 text-success border-success/20",
  OT: "bg-cyan-500/15 text-cyan-700 border-cyan-500/20",
  COMPRA: "bg-info/15 text-info border-info/20",
  NOTA_CREDITO: "bg-danger/15 text-danger border-danger/20",
};

export function crearColumnasDocumentos(
  acciones: AccionesDocumento,
): ColumnDef<DocumentoFiscal, unknown>[] {
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
      id: "tipo",
      header: "Tipo",
      accessorFn: (fila) => TIPO_LABEL[fila.tipo],
      cell: ({ row }) => (
        <Badge
          className={cn(
            "whitespace-nowrap border px-2 py-0.5 text-xs font-medium",
            COLOR_TIPO[row.original.tipo],
          )}
        >
          {TIPO_LABEL[row.original.tipo]}
        </Badge>
      ),
    },
    {
      id: "tercero",
      header: "Tercero",
      accessorFn: (fila) => fila.terceroId,
      cell: ({ row }) => (
        <p className="truncate text-sm text-foreground">
          {acciones.nombreTercero(row.original.terceroId)}
        </p>
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
      id: "total",
      header: () => <div className="text-right">Total</div>,
      accessorFn: (fila) => fila.total ?? 0,
      cell: ({ row }) => (
        // La factura no guarda su total: se cruza con su venta. Cuando esa venta
        // no está en el listado cargado se pone una raya, no un cero.
        <div
          className={cn(
            "text-right font-mono text-sm tabular-nums",
            row.original.anulado
              ? "text-muted-foreground/70 line-through"
              : "font-semibold text-foreground",
          )}
        >
          {row.original.total === null ? "—" : formatCOP(row.original.total)}
        </div>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      accessorFn: (fila) => (fila.anulado ? "ANULADA" : "EMITIDA"),
      cell: ({ row }) => (
        <StatusBadge estado={row.original.anulado ? "ANULADA" : "EMITIDA"} />
      ),
    },
    {
      id: "acciones",
      header: cabeceraAcciones,
      cell: ({ row }) => {
        const documento = row.original;
        const lista: AccionFila[] = [];

        // Solo lo que emite la empresa tiene impreso propio.
        if (documento.tipo === "VENTA" || documento.tipo === "OT") {
          lista.push({
            label: "Ver e imprimir",
            icon: Printer,
            onSelect: () => acciones.onImprimir(documento),
          });
        }

        if (documento.tipo === "NOTA_CREDITO") {
          lista.push({
            label: "Ver la nota",
            icon: Printer,
            onSelect: () => acciones.onVerNota(documento),
          });
        }

        if (documento.origen) {
          lista.push({
            label: documento.tipo === "COMPRA" ? "Ver la compra" : "Ver la venta",
            icon: ExternalLink,
            onSelect: () => acciones.onIrAlOrigen(documento),
          });
        }

        // Sobre una factura anulada no hay nada más que devolver, y la nota
        // crédito solo se emite sobre lo que emitió la empresa.
        if (
          acciones.puedeEmitirNota &&
          !documento.anulado &&
          (documento.tipo === "VENTA" || documento.tipo === "OT")
        ) {
          lista.push({
            label: "Emitir nota crédito",
            icon: FileMinus,
            separadorAntes: true,
            onSelect: () => acciones.onNotaCredito(documento),
          });
        }

        return <MenuFila acciones={lista} />;
      },
    },
  ];
}
