"use client";

import { FormDialog } from "@/components/shared/FormDialog";
import { VentaDetalleView } from "./VentaDetalleView";

interface VentaDetalleModalProps {
  /** `null` mientras no hay ninguna abierta: el diálogo no consulta nada. */
  ventaId: string | null;
  /** Cómo se titula el diálogo. Lo sabe quien abre, sin pedir la venta otra vez. */
  titulo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * La venta en un diálogo, sobre el listado del que se abrió.
 *
 * Mismo cuerpo que la página `/dashboard/ventas/[id]`, que sigue existiendo
 * para el enlace directo: el detalle se escribe una sola vez.
 */
export function VentaDetalleModal({
  ventaId,
  titulo,
  open,
  onOpenChange,
}: VentaDetalleModalProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      titulo={titulo ?? "Detalle de la venta"}
      ancho={960}
    >
      {ventaId && <VentaDetalleView key={ventaId} ventaId={ventaId} enModal />}
    </FormDialog>
  );
}
