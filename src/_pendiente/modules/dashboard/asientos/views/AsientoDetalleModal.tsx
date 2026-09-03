"use client";

import { FormDialog } from "@/components/shared/FormDialog";
import { AsientoDetalleView } from "./AsientoDetalleView";
import type { Asiento } from "../types/asientos.types";

interface AsientoDetalleModalProps {
  /** `null` mientras no hay ninguno abierto: el diálogo no consulta nada. */
  asientoId: string | null;
  numero?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Saltar al asiento que lo reversa sin cerrar el diálogo. */
  onVerAsiento?: (asientoId: string) => void;
  /** Abrir la venta o la compra que lo produjo. */
  onVerOrigen?: (asiento: Asiento) => void;
}

/**
 * El asiento en un diálogo, sobre el listado del que se abrió.
 *
 * Mismo cuerpo que la página `/dashboard/asientos/[id]`, que sigue existiendo
 * para el enlace directo: el detalle se escribe una sola vez y se muestra en
 * los dos sitios.
 */
export function AsientoDetalleModal({
  asientoId,
  numero,
  open,
  onOpenChange,
  onVerAsiento,
  onVerOrigen,
}: AsientoDetalleModalProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      titulo={numero ? `Asiento #${numero}` : "Detalle del asiento"}
      ancho={960}
    >
      {asientoId && (
        <AsientoDetalleView
          key={asientoId}
          asientoId={asientoId}
          enModal
          onVerAsiento={onVerAsiento}
          onVerOrigen={onVerOrigen}
        />
      )}
    </FormDialog>
  );
}
