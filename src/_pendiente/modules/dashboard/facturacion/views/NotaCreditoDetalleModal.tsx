"use client";

import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/shared/FormDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { useGetNotaCredito } from "../hooks/useFacturacion";
import { MOTIVOS_NOTA, type NotaCredito } from "../types/facturacion.types";

interface NotaCreditoDetalleModalProps {
  nota: NotaCredito | null;
  /** El número de la factura corregida, ya resuelto por el listado. */
  numeroFactura: string;
  onOpenChange: (open: boolean) => void;
}

const LABEL_MOTIVO = new Map(MOTIVOS_NOTA.map((motivo) => [motivo.id, motivo.label]));

/**
 * Lo que se devolvió, renglón por renglón.
 *
 * El listado no trae las líneas —`GET /notas-credito` devuelve solo las
 * cabeceras— así que se piden acá con el detalle. A diferencia de la factura,
 * la nota SÍ guarda sus renglones: no tiene un origen del cual leerlos.
 */
export function NotaCreditoDetalleModal({
  nota,
  numeroFactura,
  onOpenChange,
}: NotaCreditoDetalleModalProps) {
  const router = useRouter();
  const { data: completa, isLoading } = useGetNotaCredito(nota?.id);
  const terceros = useMapaTerceros();

  if (!nota) return null;

  const detalles = completa?.detalles ?? [];

  return (
    <FormDialog open onOpenChange={onOpenChange} titulo={`Nota crédito ${nota.numero}`} ancho={680}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-foreground">{terceros.nombre(nota.terceroId)}</p>
            <p className="text-xs text-muted-foreground">
              {formatFecha(nota.fechaEmision)} · corrige la factura{" "}
              <span className="font-mono">{numeroFactura}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {LABEL_MOTIVO.get(nota.motivo) ?? nota.motivo}
            </span>
            <StatusBadge estado={nota.alcance} />
          </div>
        </div>

        {nota.alcance === "TOTAL" && (
          <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            Al ser total, esta nota anuló la factura y liberó el documento de origen, que volvió a
            ser editable.
          </p>
        )}

        {isLoading ? (
          <SkeletonTable filas={3} columnas={4} />
        ) : (
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
                {detalles.map((detalle) => (
                  <tr key={detalle.id} className="border-t border-border">
                    <td className="py-2 text-foreground">
                      {detalle.descripcion ?? "—"}
                      {detalle.productoId && detalle.costoUnitario > 0 && (
                        <span className="block text-xs text-muted-foreground/70">
                          volvió al kardex a {formatCOP(detalle.costoUnitario)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono text-muted-foreground">
                      {detalle.cantidad}
                    </td>
                    <td className="py-2 text-right font-mono text-muted-foreground">
                      {formatCOP(detalle.precioUnitario)}
                    </td>
                    <td className="py-2 text-right font-mono text-muted-foreground">
                      {detalle.porcentajeIva}%
                    </td>
                    <td className="py-2 text-right font-mono font-medium text-foreground">
                      {formatCOP(detalle.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">{formatCOP(nota.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA</span>
            <span className="font-mono">{formatCOP(nota.iva)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
            <span>Total devuelto</span>
            <span className="font-mono">{formatCOP(nota.total)}</span>
          </div>
        </div>

        {nota.observacion && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Observación</p>
            <p className="text-sm text-foreground">{nota.observacion}</p>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            onOpenChange(false);
            router.push(`/dashboard/asientos/${nota.asientoId}`);
          }}
        >
          <BookOpen size={15} strokeWidth={1.75} />
          Ver el asiento
        </Button>
      </div>
    </FormDialog>
  );
}
