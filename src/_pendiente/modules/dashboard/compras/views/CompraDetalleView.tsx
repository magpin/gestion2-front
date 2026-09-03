"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Ban, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useMapaProductos, useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { AnularCompraModal } from "../components/AnularCompraModal";
import { useGetCompra } from "../hooks/useCompras";
import { useAnularCompra } from "../hooks/useCompraMutations";
import { estadoDeCompra } from "../types/compras.types";

interface CompraDetalleViewProps {
  compraId: string;
  /** Dentro de un diálogo: sin botón de volver y sin título propio, que ya los
   *  pone el diálogo. Repetirlos deja dos encabezados uno sobre otro. */
  enModal?: boolean;
}

/**
 * La compra registrada, de solo lectura.
 *
 * No hay edición y no es un olvido: la compra ya movió el kardex y ya asentó.
 * Un trigger impide tocar sus líneas desde la base, así que la única corrección
 * posible es anular y volver a registrar.
 */
export function CompraDetalleView({ compraId, enModal = false }: CompraDetalleViewProps) {
  const router = useRouter();
  const roles = useAuthStore((state) => state.roles);
  // Anular es del mismo rol que registra: el backend protege el módulo entero
  // con COMPRAS, no con DIRECTOR.
  const puedeAnular = roles.includes("COMPRAS");

  const [anulando, setAnulando] = useState(false);
  const { data: compra, isLoading, isError, refetch } = useGetCompra(compraId);
  const anular = useAnularCompra();
  const terceros = useMapaTerceros();
  const productos = useMapaProductos();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !compra) {
    return (
      <EmptyState
        icon={AlertCircle}
        titulo="No se pudo cargar la compra"
        accion={{ label: "Reintentar", onClick: () => void refetch() }}
      />
    );
  }

  const saldo = compra.saldoPendiente;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!enModal && (
            <Button size="sm" className="gap-1.5" onClick={() => router.push("/dashboard/compras")}>
              <ArrowLeft size={15} strokeWidth={1.75} />
              Compras
            </Button>
          )}
          <div className="flex items-center gap-2">
            {!enModal && (
              <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {compra.numeroFactura}
              </h1>
            )}
            <StatusBadge estado={estadoDeCompra(compra)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push(`/dashboard/asientos/${compra.asientoId}`)}
          >
            <BookOpen size={15} strokeWidth={1.75} />
            Ver el asiento
          </Button>
          {puedeAnular && !compra.anulada && (
            <Button className="gap-2 text-destructive" onClick={() => setAnulando(true)}>
              <Ban size={15} strokeWidth={1.75} />
              Anular
            </Button>
          )}
        </div>
      </div>

      {compra.anulada && compra.motivoAnulacion && (
        <Card className="gap-1 border-destructive/40 p-4">
          <span className="text-xs text-muted-foreground/70">Motivo de la anulación</span>
          <span className="text-sm text-foreground">{compra.motivoAnulacion}</span>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="gap-1 p-4">
          <span className="text-xs text-muted-foreground/70">Proveedor</span>
          <span className="text-sm font-medium text-foreground">
            {terceros.nombre(compra.terceroId)}
          </span>
          <span className="text-xs text-muted-foreground">
            {terceros.documento(compra.terceroId)}
          </span>
        </Card>
        <Card className="gap-1 p-4">
          <span className="text-xs text-muted-foreground/70">Fecha / Condición</span>
          <span className="text-sm font-medium text-foreground">
            {formatFecha(compra.fecha)}
          </span>
          <span className="text-xs text-muted-foreground">
            {compra.condicion === "CREDITO" ? "Crédito" : "Contado"}
          </span>
        </Card>
        <Card className="gap-1 p-4">
          <span className="text-xs text-muted-foreground/70">Total</span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatCOP(compra.total)}
          </span>
        </Card>
        <Card className="gap-1 p-4">
          <span className="text-xs text-muted-foreground/70">Saldo por pagar</span>
          <span
            className={
              saldo > 0
                ? "font-mono text-sm font-semibold text-warning"
                : "font-mono text-sm font-semibold text-success"
            }
          >
            {formatCOP(saldo)}
          </span>
          {saldo > 0 && !compra.anulada && (
            <span className="text-xs text-muted-foreground/70">Se paga desde Caja</span>
          )}
        </Card>
      </div>

      <Card className="gap-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">Líneas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground/70">
                <th className="pb-2 font-medium">Producto</th>
                <th className="pb-2 text-right font-medium">Cantidad</th>
                <th className="pb-2 text-right font-medium">Costo</th>
                <th className="pb-2 text-right font-medium">IVA</th>
                <th className="pb-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(compra.detalles ?? []).map((detalle) => (
                <tr key={detalle.id} className="border-t border-border">
                  <td className="py-2 text-foreground">
                    {productos.nombre(detalle.productoId)}
                    <span className="block text-xs text-muted-foreground/70">
                      {productos.codigo(detalle.productoId)}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono text-muted-foreground">
                    {detalle.cantidad}
                  </td>
                  <td className="py-2 text-right font-mono text-muted-foreground">
                    {formatCOP(detalle.costoUnitario)}
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

        <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">{formatCOP(compra.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA</span>
            <span className="font-mono">{formatCOP(compra.iva)}</span>
          </div>
          {compra.retefuente > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Retención</span>
              <span className="font-mono">−{formatCOP(compra.retefuente)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
            <span>Total</span>
            <span className="font-mono">{formatCOP(compra.total)}</span>
          </div>
        </div>
      </Card>

      {compra.observacion && (
        <Card className="gap-1 p-4">
          <span className="text-xs text-muted-foreground/70">Observación</span>
          <span className="text-sm text-foreground">{compra.observacion}</span>
        </Card>
      )}

      <AnularCompraModal
        open={anulando}
        onOpenChange={setAnulando}
        loading={anular.isPending}
        onConfirmar={(motivo) =>
          anular.mutate({ id: compra.id, motivo }, { onSuccess: () => setAnulando(false) })
        }
      />
    </div>
  );
}
