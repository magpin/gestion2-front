"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { aviso } from "@/lib/avisos";
import { formatCOP } from "@/lib/utils";
import { movimientosConceptoApi } from "../services/movimientos-concepto.service";
import type { Direccion, MovimientoConcepto } from "../types/movimientos-concepto.types";

/**
 * Los ingresos o egresos sin factura registrados a mano, con su anulación.
 * Lo que salió de un recibo o de un comprobante no aparece: se ve y se anula
 * con su documento.
 */
export function ListaMovimientosConcepto({
  direccion,
  puedeAnular,
}: {
  direccion: Direccion;
  puedeAnular: boolean;
}) {
  const [anulando, setAnulando] = useState<MovimientoConcepto | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["movimientos-concepto", direccion, "MANUAL"],
    queryFn: () => movimientosConceptoApi.listar({ direccion, origen: "MANUAL" }),
  });

  if (isLoading) return <SkeletonTable />;
  if (data.length === 0) {
    return (
      <EmptyState
        titulo={direccion === "ENTRADA" ? "Sin ingresos sin factura" : "Sin pagos sin factura"}
        descripcion="Los que registres quedan acá, con su concepto."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Concepto</th>
              <th className="px-5 py-3">Detalle</th>
              <th className="px-5 py-3">{direccion === "ENTRADA" ? "Entró a" : "Salió de"}</th>
              <th className="px-5 py-3 text-right">Valor</th>
              {puedeAnular && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id} className={`border-t border-border ${m.estado === "ANULADO" ? "text-muted-foreground" : ""}`}>
                <td className="px-5 py-3 whitespace-nowrap">{m.fecha}</td>
                <td className="px-5 py-3">
                  <span className="font-semibold">{m.conceptoNombre}</span>
                  {m.terceroNombre && <p className="text-xs text-muted-foreground">{m.terceroNombre}</p>}
                </td>
                <td className="px-5 py-3">
                  {m.detalle}
                  {m.estado === "ANULADO" && (
                    <span title={m.motivoAnulacion ?? undefined} className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">
                      Anulado
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">{m.destino}</td>
                <td className="px-5 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
                  {formatCOP(m.valorMovido)}
                </td>
                {puedeAnular && (
                  <td className="px-5 py-3 text-right">
                    {m.estado === "VIGENTE" && (
                      <Button type="button" variant="outline" className="h-9 rounded-lg px-3" onClick={() => setAnulando(m)}>
                        Anular
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DialogoAnularMovimiento movimiento={anulando} onCerrar={() => setAnulando(null)} />
    </>
  );
}

function DialogoAnularMovimiento({
  movimiento,
  onCerrar,
}: {
  movimiento: MovimientoConcepto | null;
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const anular = useMutation({
    mutationFn: () => movimientosConceptoApi.anular(movimiento!.id, motivo.trim()),
    onSuccess: async () => {
      await Promise.all(
        [["movimientos-concepto"], ["cajas"], ["cuentas-bancarias"]].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      aviso.exito("Movimiento anulado");
      setMotivo("");
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  return (
    <Dialog open={movimiento !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Anular «{movimiento?.detalle}»</DialogTitle>
            <DialogDescription>
              Se registra el movimiento contrario en {movimiento?.destino}. El original queda en el libro.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>
        <DialogBody>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por qué se anula"
            aria-label="Motivo de la anulación"
            maxLength={300}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={motivo.trim().length < 3 || anular.isPending}
            onClick={() => anular.mutate()}
          >
            {anular.isPending && <Loader2 className="size-4 animate-spin" />}
            Anular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
