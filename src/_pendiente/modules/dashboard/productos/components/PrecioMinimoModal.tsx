"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { formatCOP } from "@/lib/utils";

interface PrecioMinimoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  precioActual: number;
  onConfirmar: (margenMinimoPct: number) => void;
  loading?: boolean;
}

export function PrecioMinimoModal({
  open,
  onOpenChange,
  precioActual,
  onConfirmar,
  loading,
}: PrecioMinimoModalProps) {
  const [valor, setValor] = useState("");

  // Reason: sembrar el precio actual al abrir (el cierre programático no dispara onOpenChange).
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValor(String(precioActual));
    }
  }, [open, precioActual]);

  const numero = Number(valor);
  const invalido = valor.trim() === "" || !Number.isFinite(numero) || numero < 0;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      titulo="Editar precio mínimo"
      descripcion={`Precio mínimo actual: ${formatCOP(precioActual)}`}
      ancho="sm"
      onConfirmar={() => onConfirmar(numero)}
      labelConfirmar="Guardar"
      confirmarLoading={loading}
      confirmarDisabled={invalido}
    >
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Nuevo precio mínimo de venta
        </label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
        />
      </div>
    </Modal>
  );
}
