"use client";

import { FormDialog } from "@/components/shared/FormDialog";
import { CompraDetalleView } from "./CompraDetalleView";

interface CompraDetalleModalProps {
  /** `null` mientras no hay ninguna abierta: el diálogo no consulta nada. */
  compraId: string | null;
  titulo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** La compra en un diálogo. Mismo cuerpo que `/dashboard/compras/[id]`. */
export function CompraDetalleModal({
  compraId,
  titulo,
  open,
  onOpenChange,
}: CompraDetalleModalProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      titulo={titulo ?? "Detalle de la compra"}
      ancho={960}
    >
      {compraId && <CompraDetalleView key={compraId} compraId={compraId} enModal />}
    </FormDialog>
  );
}
