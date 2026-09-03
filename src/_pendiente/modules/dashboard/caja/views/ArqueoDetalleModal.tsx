"use client";

import { Modal } from "@/components/shared/Modal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatCOP, formatFecha } from "@/lib/utils";
import { resultadoDeArqueo } from "../lib/ciclo-caja";
import type { ArqueoCaja } from "../types/caja.types";

interface ArqueoDetalleModalProps {
  arqueo: ArqueoCaja | null;
  onOpenChange: (open: boolean) => void;
  onVerAsiento: (asientoId: string) => void;
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="font-mono font-semibold text-foreground">{valor}</span>
    </div>
  );
}

/**
 * El conteo de un día, ya cerrado.
 *
 * Se abre en modal y no en una ruta propia: un arqueo son seis datos y una
 * observación, y salir de la pantalla para leerlos costaría más que leerlos.
 */
export function ArqueoDetalleModal({
  arqueo,
  onOpenChange,
  onVerAsiento,
}: ArqueoDetalleModalProps) {
  if (!arqueo) return null;

  const resultado = resultadoDeArqueo(arqueo);
  const cuadra = resultado === "CUADRA";

  return (
    <Modal
      open
      onOpenChange={onOpenChange}
      titulo={`Arqueo del ${formatFecha(arqueo.fecha)}`}
      ancho="md"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge estado={resultado} />
          <span className="text-xs text-muted-foreground">
            {/* Único documento del esquema que puede no tener asiento: uno que
                cuadra es un hecho administrativo, no contable. */}
            {arqueo.asientoId === null ? "sin asiento" : "con asiento de ajuste"}
          </span>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-muted px-3 py-3">
          <Fila etiqueta="Saldo del sistema" valor={formatCOP(arqueo.saldoSistema)} />
          <Fila etiqueta="Efectivo contado" valor={formatCOP(arqueo.saldoContado)} />
          <div className="border-t border-border pt-2">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Diferencia</span>
              <span
                className={
                  cuadra
                    ? "font-mono font-semibold text-foreground"
                    : "font-mono font-semibold text-destructive"
                }
              >
                {formatCOP(arqueo.diferencia)}
              </span>
            </div>
          </div>
        </div>

        {arqueo.observacion && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Observación</p>
            <p className="text-sm text-foreground">{arqueo.observacion}</p>
          </div>
        )}

        {arqueo.asientoId && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onVerAsiento(arqueo.asientoId as string)}
          >
            Ver el asiento del ajuste
          </Button>
        )}
      </div>
    </Modal>
  );
}
