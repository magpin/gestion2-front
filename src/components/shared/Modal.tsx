"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type AnchoModal = "sm" | "md" | "lg";

// Reason: inline maxWidth gana sobre las clases data-[size] del primitivo y degrada bien en móvil (w-full).
const ANCHO_PX: Record<AnchoModal, number> = {
  sm: 420,
  md: 520,
  lg: 680,
};

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
  ancho?: AnchoModal;
  // Si se define onConfirmar, se renderiza el footer con Cancelar + Confirmar.
  onConfirmar?: () => void;
  labelConfirmar?: string;
  labelCancelar?: string;
  confirmarLoading?: boolean;
  confirmarDisabled?: boolean;
  confirmarDestructivo?: boolean;
}

// Modal controlado con footer opcional de confirmación. El cierre lo controla
// el consumidor vía onOpenChange.
export function Modal({
  open,
  onOpenChange,
  titulo,
  descripcion,
  children,
  ancho = "sm",
  onConfirmar,
  labelConfirmar = "Confirmar",
  labelCancelar = "Cancelar",
  confirmarLoading = false,
  confirmarDisabled = false,
  confirmarDestructivo = false,
}: ModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent style={{ maxWidth: ANCHO_PX[ancho] }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {descripcion && (
            <AlertDialogDescription>{descripcion}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {children}

        {onConfirmar && (
          <AlertDialogFooter>
            <AlertDialogCancel
              render={<Button variant="outline">{labelCancelar}</Button>}
            />
            <Button
              variant={confirmarDestructivo ? "destructive" : "default"}
              onClick={onConfirmar}
              disabled={confirmarDisabled || confirmarLoading}
            >
              {confirmarLoading ? "Procesando…" : labelConfirmar}
            </Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
