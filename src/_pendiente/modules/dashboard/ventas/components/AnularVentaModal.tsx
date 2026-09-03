"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";

interface AnularVentaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirmar: (motivo: string) => void;
}

/**
 * Anular exige un motivo de al menos 5 caracteres — lo pide el backend.
 *
 * La venta no se borra: el stock vuelve al costo con el que salió y los dos
 * asientos quedan reversados. El original no desaparece, queda marcado.
 */
export function AnularVentaModal({
  open,
  onOpenChange,
  loading,
  onConfirmar,
}: AnularVentaModalProps) {
  const [motivo, setMotivo] = useState("");

  // El campo se limpia al cerrar y al confirmar, no con un efecto sobre `open`:
  // el motivo de una anulación no debería aparecer escrito en la siguiente.
  const cerrar = (abierto: boolean) => {
    if (!abierto) setMotivo("");
    onOpenChange(abierto);
  };

  return (
    <Modal
      open={open}
      onOpenChange={cerrar}
      titulo="Anular venta"
      descripcion="El stock vuelve al costo con el que salió y los dos asientos quedan reversados. La venta no se borra: queda marcada."
      labelConfirmar="Anular venta"
      confirmarDestructivo
      confirmarLoading={loading}
      confirmarDisabled={motivo.trim().length < 5}
      onConfirmar={() => {
        const texto = motivo.trim();
        setMotivo("");
        onConfirmar(texto);
      }}
    >
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">Motivo</label>
        <Input
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          placeholder="Por qué se anula…"
          autoFocus
        />
        <p className="text-xs text-muted-foreground/70">
          Mínimo 5 caracteres. Queda escrito en la venta.
        </p>
      </div>
    </Modal>
  );
}
