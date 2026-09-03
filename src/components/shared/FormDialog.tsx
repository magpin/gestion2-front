"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  children: ReactNode;
  // Ancho máximo en px (los formularios con editor de líneas necesitan más espacio).
  ancho?: number;
}

// Diálogo amplio y desplazable para formularios (crear venta/compra/cotización/OT).
// A diferencia de Modal (confirmaciones), no trae footer: el formulario aporta sus botones.
export function FormDialog({
  open,
  onOpenChange,
  titulo,
  children,
  ancho = 860,
}: FormDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent style={{ maxWidth: ancho }} className="max-h-[92vh]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <AlertDialogTitle className="text-lg font-bold tracking-tight text-foreground">
            {titulo}
          </AlertDialogTitle>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => onOpenChange(false)}
            className="shrink-0 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto pr-1">{children}</div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
