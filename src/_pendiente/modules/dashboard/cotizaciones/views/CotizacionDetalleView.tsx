"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Pencil,
  Send,
  ShoppingCart,
  ThumbsDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormDialog } from "@/components/shared/FormDialog";
import { formatCOP, formatFecha } from "@/lib/utils";
import { useMapaProductos, useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { ConvertirCotizacionModal } from "../components/ConvertirCotizacionModal";
import { useGetCotizacion } from "../hooks/useCotizaciones";
import {
  useCambiarEstadoCotizacion,
  useConvertirCotizacion,
} from "../hooks/useCotizacionMutations";
import { CotizacionFormView } from "./CotizacionFormView";
import { sePuedeConvertir, sePuedeEditar } from "../types/cotizaciones.types";

interface CotizacionDetalleViewProps {
  cotizacionId: string;
  /** Dentro de un diálogo: sin botón de volver y sin título propio, que ya los
   *  pone el diálogo. Repetirlos deja dos encabezados uno sobre otro. */
  enModal?: boolean;
}

export function CotizacionDetalleView({
  cotizacionId,
  enModal = false,
}: CotizacionDetalleViewProps) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [convirtiendo, setConvirtiendo] = useState(false);

  const { data: cotizacion, isLoading, isError, refetch } = useGetCotizacion(cotizacionId);
  const productos = useMapaProductos();
  const terceros = useMapaTerceros();
  const cambiarEstado = useCambiarEstadoCotizacion();
  const convertir = useConvertirCotizacion();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !cotizacion) {
    return (
      <EmptyState
        icon={AlertCircle}
        titulo="No se pudo cargar la cotización"
        accion={{ label: "Reintentar", onClick: () => void refetch() }}
      />
    );
  }

  const lineas = cotizacion.detalles ?? [];
  const cliente = terceros.tercero(cotizacion.terceroId);
  const itemsLibres = lineas.filter((linea) => !linea.productoId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!enModal && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => router.push("/dashboard/cotizaciones")}
            >
              <ArrowLeft size={15} strokeWidth={1.75} />
              Cotizaciones
            </Button>
          )}
          <div className="flex items-center gap-2">
            {!enModal && (
              <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {cotizacion.numero}
              </h1>
            )}
            <StatusBadge estado={cotizacion.estadoVisible} />
            {cotizacion.ventaId && <StatusBadge estado="CONVERTIDA" />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cotizacion.ventaId && (
            <Button
              className="gap-2"
              onClick={() => router.push(`/dashboard/ventas/${cotizacion.ventaId}`)}
            >
              <ShoppingCart size={15} strokeWidth={1.75} />
              Ver la venta
            </Button>
          )}
          {sePuedeEditar(cotizacion) && (
            <Button className="gap-2" onClick={() => setEditando(true)}>
              <Pencil size={15} strokeWidth={1.75} />
              Editar
            </Button>
          )}
          {cotizacion.estado === "BORRADOR" && !cotizacion.ventaId && (
            <Button
              className="gap-2"
              disabled={cambiarEstado.isPending}
              onClick={() =>
                cambiarEstado.mutate({ id: cotizacion.id, estado: "ENVIADA" })
              }
            >
              <Send size={15} strokeWidth={1.75} />
              Marcar enviada
            </Button>
          )}
          {sePuedeConvertir(cotizacion) && (
            <>
              <Button className="gap-2" onClick={() => setConvirtiendo(true)}>
                <ShoppingCart size={15} strokeWidth={1.75} />
                Convertir en venta
              </Button>
              <Button
                className="gap-2"
                disabled={cambiarEstado.isPending}
                onClick={() =>
                  cambiarEstado.mutate({ id: cotizacion.id, estado: "RECHAZADA" })
                }
              >
                <ThumbsDown size={15} strokeWidth={1.75} />
                Rechazar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Vencida: los precios que se le ofrecieron al cliente ya no valen. El
          backend rechaza convertirla, así que se hace una nueva. */}
      {cotizacion.vencida && (
        <Card className="border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Venció el {formatFecha(cotizacion.validoHasta)}. Para vender hay que cotizar de nuevo:
          los precios que se ofrecieron ya no valen.
        </Card>
      )}

      {itemsLibres.length > 0 && !cotizacion.ventaId && (
        <Card className="border-warning/40 bg-warning/5 p-4 text-sm text-warning">
          {itemsLibres.length === 1
            ? "Una línea es un ítem libre y no está en el catálogo."
            : `${itemsLibres.length} líneas son ítems libres y no están en el catálogo.`}{" "}
          Convertir en venta exige crearlas como producto: la venta mueve inventario.
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="gap-3 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Cliente</h2>
          <div className="text-sm">
            <p className="text-foreground">{cliente?.nombre ?? "—"}</p>
            <p className="text-xs text-muted-foreground/70">{cliente?.numeroDocumento ?? ""}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p className="text-foreground">{formatFecha(cotizacion.fecha)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Válida hasta</p>
              <p className={cotizacion.vencida ? "text-destructive" : "text-foreground"}>
                {formatFecha(cotizacion.validoHasta)}
              </p>
            </div>
          </div>
          {cotizacion.observacion && (
            <p className="text-xs text-muted-foreground">{cotizacion.observacion}</p>
          )}
        </Card>

        <Card className="gap-1.5 p-5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">{formatCOP(Number(cotizacion.subtotal))}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA</span>
            <span className="font-mono">{formatCOP(Number(cotizacion.iva))}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold text-foreground">
            <span>Total</span>
            <span className="font-mono">{formatCOP(Number(cotizacion.total))}</span>
          </div>
          <p className="pt-2 text-xs text-muted-foreground/70">
            No genera asiento ni mueve inventario. El costo aparece al convertirla, con el
            promedio de ese momento.
          </p>
        </Card>
      </div>

      <Card className="gap-3 p-5">
        <h2 className="text-sm font-semibold text-foreground">Líneas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Ítem</th>
                <th className="py-2 text-right font-medium">Cantidad</th>
                <th className="py-2 text-right font-medium">Precio</th>
                <th className="py-2 text-right font-medium">IVA</th>
                <th className="py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => (
                <tr key={linea.id} className="border-b border-border/50">
                  <td className="py-2">
                    <p className="text-foreground">
                      {linea.productoId
                        ? productos.nombre(linea.productoId)
                        : (linea.descripcion ?? "—")}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {linea.productoId ? productos.codigo(linea.productoId) : "Ítem libre"}
                    </p>
                  </td>
                  <td className="py-2 text-right font-mono">{Number(linea.cantidad)}</td>
                  <td className="py-2 text-right font-mono">
                    {formatCOP(Number(linea.precioUnitario))}
                  </td>
                  <td className="py-2 text-right font-mono text-muted-foreground">
                    {Number(linea.porcentajeIva)}%
                  </td>
                  <td className="py-2 text-right font-mono font-medium">
                    {formatCOP(Number(linea.subtotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <FormDialog
        open={editando}
        onOpenChange={setEditando}
        titulo={`Editar cotización ${cotizacion.numero}`}
      >
        <CotizacionFormView
          cotizacionId={cotizacion.id}
          enModal
          onExito={() => {
            setEditando(false);
            void refetch();
          }}
          onCerrar={() => setEditando(false)}
        />
      </FormDialog>

      <ConvertirCotizacionModal
        open={convirtiendo}
        onOpenChange={setConvirtiendo}
        numero={cotizacion.numero}
        loading={convertir.isPending}
        onConfirmar={(condicion) =>
          convertir.mutate(
            { id: cotizacion.id, data: { condicion } },
            {
              onSuccess: (venta) => {
                setConvirtiendo(false);
                router.push(`/dashboard/ventas/${venta.id}`);
              },
            },
          )
        }
      />
    </div>
  );
}
