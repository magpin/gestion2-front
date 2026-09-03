"use client";

import { AlertCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/shared/FormDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { useGetImpresion } from "../hooks/useFacturacion";
import type { Factura } from "../types/facturacion.types";

interface FacturaImpresaModalProps {
  factura: Factura | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * El impreso.
 *
 * Los renglones NO están guardados en la factura: se leen del origen en el
 * momento de mirarlos. Eso es seguro porque emitir congeló ese origen — sin esa
 * regla, esta pantalla podría contradecir el papel que ya tiene el cliente.
 *
 * Lo que se ve es lo que se imprime: `window.print()` sobre este mismo bloque,
 * no una plantilla aparte que se desincronizaría con el tiempo.
 */
export function FacturaImpresaModal({ factura, onOpenChange }: FacturaImpresaModalProps) {
  const { data: impresa, isLoading, isError, refetch } = useGetImpresion(factura?.id);
  const terceros = useMapaTerceros();

  if (!factura) return null;

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      titulo={`Factura ${factura.numero}`}
      ancho={720}
    >
      {isLoading && <SkeletonTable filas={4} columnas={4} />}

      {!isLoading && (isError || !impresa) && (
        <EmptyState
          icon={AlertCircle}
          titulo="No se pudo componer el impreso"
          descripcion="El encabezado sale de la factura y los renglones del documento de origen."
          accion={{ label: "Reintentar", onClick: () => void refetch() }}
        />
      )}

      {!isLoading && impresa && (
        <div className="space-y-4">
          <div data-impreso className="space-y-5 rounded-lg border border-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xl font-bold text-foreground">{impresa.numero}</p>
                <p className="text-sm text-muted-foreground">
                  Emitida el {formatFecha(impresa.fechaEmision)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {terceros.nombre(impresa.terceroId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {terceros.documento(impresa.terceroId)}
                </p>
              </div>
            </div>

            {impresa.anulada && (
              <p className="rounded-md border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive">
                ANULADA por una nota crédito total
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground/70">
                    <th className="pb-2 font-medium">Descripción</th>
                    <th className="pb-2 text-right font-medium">Cantidad</th>
                    <th className="pb-2 text-right font-medium">Precio</th>
                    <th className="pb-2 text-right font-medium">IVA</th>
                    <th className="pb-2 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {impresa.renglones.map((renglon, indice) => (
                    <tr key={`${renglon.descripcion}-${indice}`} className="border-t border-border">
                      <td className="py-2 text-foreground">{renglon.descripcion}</td>
                      <td className="py-2 text-right font-mono text-muted-foreground">
                        {renglon.cantidad}
                      </td>
                      <td className="py-2 text-right font-mono text-muted-foreground">
                        {formatCOP(renglon.precioUnitario)}
                      </td>
                      <td className="py-2 text-right font-mono text-muted-foreground">
                        {renglon.porcentajeIva}%
                      </td>
                      <td className="py-2 text-right font-mono font-medium text-foreground">
                        {formatCOP(renglon.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{formatCOP(impresa.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>IVA</span>
                <span className="font-mono">{formatCOP(impresa.iva)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
                <span>Total</span>
                <span className="font-mono">{formatCOP(impresa.total)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground/70">
              La retención que el cliente practica no baja este total: baja el saldo por cobrar.
            </p>
          </div>

          <div data-no-imprimir className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button className="gap-2" onClick={() => window.print()}>
              <Printer size={16} strokeWidth={1.75} />
              Imprimir
            </Button>
          </div>
        </div>
      )}
    </FormDialog>
  );
}
