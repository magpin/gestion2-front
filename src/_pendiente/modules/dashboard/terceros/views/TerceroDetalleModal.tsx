"use client";

import { FormDialog } from "@/components/shared/FormDialog";
import { TerceroDetalleView } from "./TerceroDetalleView";

interface TerceroDetalleModalProps {
  /** `null` mientras no hay ninguno abierto: el diálogo no consulta nada. */
  terceroId: string | null;
  nombre?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pasar del detalle al formulario sin salir del listado. */
  onEditar?: () => void;
}

/** El tercero en un diálogo. Mismo cuerpo que `/dashboard/terceros/[id]`. */
export function TerceroDetalleModal({
  terceroId,
  nombre,
  open,
  onOpenChange,
  onEditar,
}: TerceroDetalleModalProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      titulo={nombre ?? "Detalle del tercero"}
      ancho={960}
    >
      {terceroId && (
        <TerceroDetalleView
          key={terceroId}
          terceroId={terceroId}
          enModal
          onEditar={onEditar}
          // Eliminado: ya no hay nada que mostrar detrás del diálogo.
          onEliminado={() => onOpenChange(false)}
        />
      )}
    </FormDialog>
  );
}
