"use client";

import { FormDialog } from "@/components/shared/FormDialog";
import { CotizacionDetalleView } from "./CotizacionDetalleView";

interface CotizacionDetalleModalProps {
  /** `null` mientras no hay ninguna abierta: el diálogo no consulta nada. */
  cotizacionId: string | null;
  numero?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** La cotización en un diálogo. Mismo cuerpo que `/dashboard/cotizaciones/[id]`. */
export function CotizacionDetalleModal({
  cotizacionId,
  numero,
  open,
  onOpenChange,
}: CotizacionDetalleModalProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      titulo={numero ? `Cotización ${numero}` : "Detalle de la cotización"}
      ancho={960}
    >
      {cotizacionId && (
        <CotizacionDetalleView key={cotizacionId} cotizacionId={cotizacionId} enModal />
      )}
    </FormDialog>
  );
}
