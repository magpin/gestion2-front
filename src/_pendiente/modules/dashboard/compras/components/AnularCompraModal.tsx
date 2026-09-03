"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";

interface AnularCompraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirmar: (motivo: string) => void;
}

/**
 * Anular exige un motivo de al menos 5 caracteres — lo pide el backend.
 *
 * La compra no se borra ni se edita: el stock sale del kardex y el asiento
 * original queda reversado, no eliminado. Corregir una compra es anularla y
 * volver a registrarla, igual que en contabilidad corregir es reversar.
 */
export function AnularCompraModal({
  open,
  onOpenChange,
  loading,
  onConfirmar,
}: AnularCompraModalProps) {
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
      titulo="Anular compra"
      descripcion="El stock vuelve a salir del kardex y el asiento queda reversado. La compra no se borra: queda marcada."
      labelConfirmar="Anular compra"
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
          Mínimo 5 caracteres. Queda escrito en la compra.
        </p>
      </div>
    </Modal>
  );
}
