"use client";

import { Modal } from "@/components/shared/Modal";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useGetCarteraClientes } from "../hooks/useVentas";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";

interface CarteraClientesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerVenta: (ventaId: string) => void;
}

/** Quién me debe. Es el listado de ventas con `saldo_pendiente > 0`. */
export function CarteraClientesModal({
  open,
  onOpenChange,
  onVerVenta,
}: CarteraClientesModalProps) {
  const { data, isLoading } = useGetCarteraClientes(open);
  const terceros = useMapaTerceros();

  const ventas = data?.datos ?? [];
  const total = ventas.reduce((suma, venta) => suma + Number(venta.saldoPendiente), 0);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      titulo="Cartera de clientes"
      descripcion="Ventas con saldo. El cobro se registra en Caja."
      ancho="lg"
    >
      {isLoading ? (
        <SkeletonTable filas={4} />
      ) : ventas.length === 0 ? (
        <EmptyState titulo="Sin cartera" descripcion="Ningún cliente debe nada." />
      ) : (
        <div className="space-y-2">
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {ventas.map((venta) => (
              <button
                key={venta.id}
                type="button"
                onClick={() => onVerVenta(venta.id)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-left transition-colors hover:border-primary"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">
                    {terceros.nombre(venta.terceroId)}
                  </span>
                  <span className="block text-xs text-muted-foreground/70">
                    {formatFecha(venta.fecha)} · total {formatCOP(Number(venta.total))}
                  </span>
                </span>
                <span className="ml-3 shrink-0 font-mono text-sm font-semibold text-warning">
                  {formatCOP(Number(venta.saldoPendiente))}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">Total por cobrar</span>
            <span className="font-mono font-semibold text-foreground">{formatCOP(total)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
