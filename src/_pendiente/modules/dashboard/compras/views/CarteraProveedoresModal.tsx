"use client";

import { Modal } from "@/components/shared/Modal";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { useGetCarteraProveedores } from "../hooks/useCompras";

interface CarteraProveedoresModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerCompra: (compraId: string) => void;
}

/**
 * A quién le debo. Es el listado de compras con `saldo_pendiente > 0`.
 *
 * Sin tramos de antigüedad: el modelo no guarda fecha de vencimiento —la compra
 * no pacta plazo— así que un aging 0-30/31-60 saldría de una fecha inventada.
 * Está anotado como frente abierto.
 */
export function CarteraProveedoresModal({
  open,
  onOpenChange,
  onVerCompra,
}: CarteraProveedoresModalProps) {
  const { data, isLoading } = useGetCarteraProveedores(open);
  const terceros = useMapaTerceros();

  const compras = data?.datos ?? [];
  const total = compras.reduce((suma, compra) => suma + compra.saldoPendiente, 0);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      titulo="Cartera de proveedores"
      descripcion="Compras con saldo. El pago se registra en Caja."
      ancho="lg"
    >
      {isLoading ? (
        <SkeletonTable filas={4} />
      ) : compras.length === 0 ? (
        <EmptyState titulo="Sin cartera" descripcion="No se le debe nada a ningún proveedor." />
      ) : (
        <div className="space-y-2">
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {compras.map((compra) => (
              <button
                key={compra.id}
                type="button"
                onClick={() => onVerCompra(compra.id)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-left transition-colors hover:border-primary"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">
                    {terceros.nombre(compra.terceroId)}
                  </span>
                  <span className="block text-xs text-muted-foreground/70">
                    {compra.numeroFactura} · {formatFecha(compra.fecha)} · total{" "}
                    {formatCOP(compra.total)}
                  </span>
                </span>
                <span className="ml-3 shrink-0 font-mono text-sm font-semibold text-warning">
                  {formatCOP(compra.saldoPendiente)}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">Total por pagar</span>
            <span className="font-mono font-semibold text-foreground">{formatCOP(total)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
