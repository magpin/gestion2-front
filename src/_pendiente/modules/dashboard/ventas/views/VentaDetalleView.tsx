"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, ArrowLeft, Ban, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Modal } from "@/components/shared/Modal";
import { useAuthStore } from "@/core/store/authStore";
import { formatCOP, formatFecha } from "@/lib/utils";
import { AnularVentaModal } from "../components/AnularVentaModal";
import { useGetVenta } from "../hooks/useVentas";
import { useAnularVenta, useAutorizarPrecio, useFacturarVenta } from "../hooks/useVentaMutations";
import { estadoDeVenta, lineaPendienteDeFirma } from "../types/ventas.types";
import { useMapaProductos, useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";

interface VentaDetalleViewProps {
  ventaId: string;
  /** Dentro de un diálogo: sin botón de volver y sin título propio, que ya los
   *  pone el diálogo. Repetirlos deja dos encabezados uno sobre otro. */
  enModal?: boolean;
}

export function VentaDetalleView({ ventaId, enModal = false }: VentaDetalleViewProps) {
  const router = useRouter();
  const roles = useAuthStore((state) => state.roles);
  const esDirector = roles.includes("DIRECTOR");
  const puedeVender = roles.includes("VENTAS");

  const [facturando, setFacturando] = useState(false);
  const [anulando, setAnulando] = useState(false);

  const { data: venta, isLoading, isError, refetch } = useGetVenta(ventaId);
  const productos = useMapaProductos();
  const terceros = useMapaTerceros();
  const facturar = useFacturarVenta();
  const anular = useAnularVenta();
  const autorizar = useAutorizarPrecio();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !venta) {
    return (
      <EmptyState
        icon={AlertCircle}
        titulo="No se pudo cargar la venta"
        accion={{ label: "Reintentar", onClick: () => void refetch() }}
      />
    );
  }

  const lineas = venta.detalles ?? [];
  const sinFirmar = lineas.filter(lineaPendienteDeFirma);
  const margen = Number(venta.subtotal) - Number(venta.costoTotal);
  const cliente = terceros.tercero(venta.terceroId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!enModal && (
            <Button size="sm" className="gap-1.5" onClick={() => router.push("/dashboard/ventas")}>
              <ArrowLeft size={15} strokeWidth={1.75} />
              Ventas
            </Button>
          )}
          <div className="flex items-center gap-2">
            {!enModal && (
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Venta del {formatFecha(venta.fecha)}
              </h1>
            )}
            <StatusBadge estado={estadoDeVenta(venta)} />
          </div>
        </div>

        {!venta.anulada && puedeVender && (
          <div className="flex flex-wrap items-center gap-2">
            <Button className="gap-2" onClick={() => setFacturando(true)}>
              <FileText size={15} strokeWidth={1.75} />
              Emitir factura
            </Button>
            <Button className="gap-2" onClick={() => setAnulando(true)}>
              <Ban size={15} strokeWidth={1.75} />
              Anular
            </Button>
          </div>
        )}
      </div>

      {/* Con líneas sin firmar la venta existe y ya movió stock: lo que no se
          puede es facturarla. Después de emitida la línea se congela, así que
          la firma tiene que ocurrir antes o no ocurre nunca. */}
      {sinFirmar.length > 0 && !venta.anulada && (
        <Card className="gap-2 border-warning/40 bg-warning/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-warning">
            <AlertTriangle size={15} strokeWidth={1.75} />
            {sinFirmar.length === 1
              ? "Una línea se vendió por debajo del margen mínimo y espera la firma del director."
              : `${sinFirmar.length} líneas se vendieron por debajo del margen mínimo y esperan la firma del director.`}
          </p>
          <p className="text-xs text-muted-foreground">
            Hasta que se firmen, la factura no se puede emitir: emitir congela la línea, así que
            después ya no habría manera de autorizarla.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="gap-3 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Cliente</h2>
          <div className="text-sm">
            <p className="text-foreground">{cliente?.nombre ?? "—"}</p>
            <p className="text-xs text-muted-foreground/70">
              {cliente?.numeroDocumento ?? ""}
              {cliente?.esAgenteRetenedor ? " · agente retenedor" : ""}
            </p>
          </div>
          {venta.observacion && (
            <p className="text-xs text-muted-foreground">{venta.observacion}</p>
          )}
          {venta.anulada && venta.motivoAnulacion && (
            <p className="text-xs text-destructive">Anulada: {venta.motivoAnulacion}</p>
          )}
        </Card>

        <Card className="gap-1.5 p-5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">{formatCOP(Number(venta.subtotal))}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA</span>
            <span className="font-mono">{formatCOP(Number(venta.iva))}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
            <span>Total</span>
            <span className="font-mono">{formatCOP(Number(venta.total))}</span>
          </div>
          {Number(venta.retefuenteFavor) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Retención a favor</span>
              <span className="font-mono">−{formatCOP(Number(venta.retefuenteFavor))}</span>
            </div>
          )}
          <div className="flex justify-between text-warning">
            <span>Saldo pendiente</span>
            <span className="font-mono font-semibold">
              {formatCOP(Number(venta.saldoPendiente))}
            </span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-1.5 text-muted-foreground">
            <span>Costo de la mercancía</span>
            <span className="font-mono">{formatCOP(Number(venta.costoTotal))}</span>
          </div>
          <div className="flex justify-between text-success">
            <span>Margen</span>
            <span className="font-mono font-semibold">{formatCOP(margen)}</span>
          </div>
        </Card>
      </div>

      <Card className="gap-3 p-5">
        <h2 className="text-sm font-semibold text-foreground">Líneas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Producto</th>
                <th className="py-2 text-right font-medium">Cantidad</th>
                <th className="py-2 text-right font-medium">Precio</th>
                <th className="py-2 text-right font-medium">Costo</th>
                <th className="py-2 text-right font-medium">IVA</th>
                <th className="py-2 text-right font-medium">Subtotal</th>
                {esDirector && <th className="py-2" />}
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => {
                const pendiente = lineaPendienteDeFirma(linea);
                return (
                  <tr key={linea.id} className="border-b border-border/50">
                    <td className="py-2">
                      <p className="text-foreground">{productos.nombre(linea.productoId)}</p>
                      <p className="text-xs text-muted-foreground/70">
                        {productos.codigo(linea.productoId)}
                      </p>
                      {pendiente && (
                        <p className="mt-0.5 text-xs text-warning">
                          Bajo el piso de {formatCOP(Number(linea.precioPiso))} · sin firmar
                        </p>
                      )}
                      {!pendiente && linea.precioAutorizadoPorId && (
                        <p className="mt-0.5 text-xs text-muted-foreground/70">
                          Rebaja autorizada
                        </p>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono">{Number(linea.cantidad)}</td>
                    <td className="py-2 text-right font-mono">
                      {formatCOP(Number(linea.precioUnitario))}
                    </td>
                    <td className="py-2 text-right font-mono text-muted-foreground">
                      {formatCOP(Number(linea.costoUnitario))}
                    </td>
                    <td className="py-2 text-right font-mono text-muted-foreground">
                      {Number(linea.porcentajeIva)}%
                    </td>
                    <td className="py-2 text-right font-mono font-medium">
                      {formatCOP(Number(linea.subtotal))}
                    </td>
                    {esDirector && (
                      <td className="py-2 text-right">
                        {pendiente && !venta.anulada && (
                          <Button
                            size="sm"
                            disabled={autorizar.isPending}
                            onClick={() => autorizar.mutate(linea.id)}
                          >
                            Autorizar
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground/70">
          El costo es una foto del promedio ponderado del instante de la venta. No cambia porque
          después entre mercancía más cara.
        </p>
      </Card>

      <Modal
        open={facturando}
        onOpenChange={setFacturando}
        titulo="Emitir factura"
        descripcion="Toma el siguiente número fiscal y congela la venta: sus líneas dejan de editarse. Corregir después es emitir una nota crédito."
        labelConfirmar="Emitir"
        confirmarLoading={facturar.isPending}
        onConfirmar={() =>
          facturar.mutate(venta.id, {
            onSuccess: () => {
              setFacturando(false);
              void refetch();
            },
          })
        }
      />

      <AnularVentaModal
        open={anulando}
        onOpenChange={setAnulando}
        loading={anular.isPending}
        onConfirmar={(motivo) =>
          anular.mutate(
            { id: venta.id, motivo },
            {
              onSuccess: () => {
                setAnulando(false);
                void refetch();
              },
            },
          )
        }
      />
    </div>
  );
}
