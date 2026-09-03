"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";

interface AnularAbonoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirmar: (motivo: string) => void;
}

/**
 * Anular exige un motivo de al menos 5 caracteres — lo pide el backend.
 *
 * El abono no se borra: el saldo vuelve al documento, el asiento queda
 * reversado y —si movió el cajón— entra el movimiento contrario. La caja solo
 * agrega, así que un cobro que desapareciera dejaría un saldo movido que nadie
 * podría explicar.
 */
export function AnularAbonoModal({
  open,
  onOpenChange,
  loading,
  onConfirmar,
}: AnularAbonoModalProps) {
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
      titulo="Anular abono"
      descripcion="El saldo vuelve al documento y el asiento queda reversado. Si movió el cajón, entra el movimiento contrario: la caja no borra, corrige agregando."
      labelConfirmar="Anular abono"
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
          Mínimo 5 caracteres. Queda escrito en el abono.
        </p>
      </div>
    </Modal>
  );
}
