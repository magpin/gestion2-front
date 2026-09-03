"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { SelectField } from "@/components/shared/SelectField";
import { CONDICIONES_VENTA, type CondicionVenta } from "@/modules/dashboard/ventas/types/ventas.types";

interface ConvertirCotizacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numero?: string;
  loading?: boolean;
  onConfirmar: (condicion: CondicionVenta) => void;
}

/**
 * Convertir nace una venta: mueve kardex y deja dos asientos.
 *
 * Lo único que la cotización no sabe es cómo se va a pagar, así que es lo único
 * que se pregunta acá. El precio se copia tal cual se ofreció; el costo lo toma
 * el backend del promedio de HOY, porque es la mercancía de hoy la que sale.
 */
export function ConvertirCotizacionModal({
  open,
  onOpenChange,
  numero,
  loading,
  onConfirmar,
}: ConvertirCotizacionModalProps) {
  const [condicion, setCondicion] = useState<CondicionVenta>("CONTADO");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      titulo="Convertir en venta"
      descripcion={`La cotización ${numero ?? ""} queda marcada como convertida y deja de editarse. La venta sale del inventario y genera sus dos asientos.`}
      labelConfirmar="Convertir"
      confirmarLoading={loading}
      onConfirmar={() => onConfirmar(condicion)}
    >
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">Condición de pago</label>
        <SelectField
          value={condicion}
          onChange={(valor) => setCondicion(valor as CondicionVenta)}
          options={CONDICIONES_VENTA.map((c) => ({ value: c.id, label: c.label }))}
        />
        <p className="text-xs text-muted-foreground/70">
          En los dos casos la venta deja saldo pendiente: el cobro se registra en Caja.
        </p>
      </div>
    </Modal>
  );
}
