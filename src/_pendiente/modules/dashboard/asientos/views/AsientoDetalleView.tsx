"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { useGetAsiento } from "../hooks/useAsientos";
import {
  ORIGEN_LABEL,
  estadoDeAsiento,
  rutaDelOrigen,
  type Asiento,
} from "../types/asientos.types";

interface AsientoDetalleViewProps {
  asientoId: string;
  /** Dentro de un diálogo: sin botón de volver y sin título propio. */
  enModal?: boolean;
  /** Saltar a otro asiento sin salir del diálogo (el que lo reversa). */
  onVerAsiento?: (asientoId: string) => void;
  /** Abrir la venta o la compra que lo produjo sin salir del diálogo. */
  onVerOrigen?: (asiento: Asiento) => void;
}

/**
 * Un asiento, renglón por renglón.
 *
 * Sin botón de anular: no existe el endpoint. Un asiento equivocado se corrige
 * anulando el documento que lo produjo, y esa anulación emite un asiento espejo
 * que apunta al original por `reversaDeId`. El original nunca desaparece.
 */
export function AsientoDetalleView({
  asientoId,
  enModal = false,
  onVerAsiento,
  onVerOrigen,
}: AsientoDetalleViewProps) {
  const router = useRouter();
  const { data: asiento, isLoading, isError, refetch } = useGetAsiento(asientoId);
  const terceros = useMapaTerceros();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !asiento) {
    return (
      <EmptyState
        icon={AlertCircle}
        titulo="No se pudo cargar el asiento"
        accion={{ label: "Reintentar", onClick: () => void refetch() }}
      />
    );
  }

  const detalles = asiento.detalles ?? [];
  const ruta = rutaDelOrigen(asiento);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* En modal no van ni el botón de volver ni el título: el diálogo ya
              trae los dos, y repetirlos deja dos encabezados uno sobre otro. */}
          {!enModal && (
            <Button size="sm" className="gap-1.5" onClick={() => router.push("/dashboard/asientos")}>
              <ArrowLeft size={15} strokeWidth={1.75} />
              Libro diario
            </Button>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {!enModal && (
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Asiento #{asiento.numero}
                </h1>
              )}
              <StatusBadge estado={estadoDeAsiento(asiento)} />
            </div>
            <p className="text-xs text-muted-foreground/70">
              {formatFecha(asiento.fecha)} ·{" "}
              {ORIGEN_LABEL[asiento.origenTipo] ?? asiento.origenTipo}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Solo VENTA y COMPRA tienen pantalla por id; los demás orígenes
              viven dentro de una pestaña y no tienen enlace directo. */}
          {ruta && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                onVerOrigen ? onVerOrigen(asiento) : router.push(ruta)
              }
            >
              <ExternalLink size={15} strokeWidth={1.75} />
              {asiento.origenTipo === "VENTA" ? "Ver la venta" : "Ver la compra"}
            </Button>
          )}
          {asiento.reversaDeId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const id = asiento.reversaDeId as string;
                if (onVerAsiento) onVerAsiento(id);
                else router.push(`/dashboard/asientos/${id}`);
              }}
            >
              Ver el asiento que reversa
            </Button>
          )}
        </div>
      </div>

      <Card className="p-5">
        <p className="mb-4 text-sm text-foreground">{asiento.descripcion ?? "—"}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground/70">
                <th className="px-3 py-2 text-left font-medium">Cuenta</th>
                <th className="px-3 py-2 text-left font-medium">Tercero</th>
                <th className="px-3 py-2 text-right font-medium">Débito</th>
                <th className="px-3 py-2 text-right font-medium">Crédito</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((detalle) => (
                <tr key={detalle.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <p className="text-foreground">
                      <span className="font-mono text-xs text-muted-foreground/70">
                        {detalle.cuenta?.codigo ?? ""}
                      </span>{" "}
                      {detalle.cuenta?.nombre ?? "—"}
                    </p>
                    {detalle.detalle && (
                      <p className="text-xs text-muted-foreground/70">{detalle.detalle}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {detalle.terceroId ? terceros.nombre(detalle.terceroId) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                    {detalle.debito > 0 ? formatCOP(detalle.debito) : ""}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                    {detalle.credito > 0 ? formatCOP(detalle.credito) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-semibold">
                <td className="px-3 py-2 text-muted-foreground" colSpan={2}>
                  Totales
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                  {formatCOP(asiento.totalDebito)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                  {formatCOP(asiento.totalCredito)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Un CHECK de la base lo garantiza, pero verlo escrito es la mitad de
            por qué alguien abre un asiento. */}
        <p className="mt-4 text-xs text-muted-foreground/70">
          Débito = crédito. Lo verifica un CHECK en la base y un trigger diferido que comprueba
          que las líneas sumen la cabecera.
        </p>
      </Card>
    </div>
  );
}
