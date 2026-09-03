"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { KpiCard } from "@/components/shared/KpiCard";
import { Modal } from "@/components/shared/Modal";
import { useAuthStore } from "@/core/store/authStore";
import { formatCOP } from "@/lib/utils";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { useGetAutorizacionesPendientes } from "@/modules/dashboard/ventas/hooks/useVentas";
import { useAutorizarPrecio } from "@/modules/dashboard/ventas/hooks/useVentaMutations";
import type { LineaPendienteAutorizacion } from "@/modules/dashboard/ventas/types/ventas.types";
import { crearColumnasAprobaciones } from "../components/aprobacionesColumns";

/**
 * La bandeja de precios bajo el piso. Rol DIRECTOR.
 *
 * Firmar no es un permiso de pantalla: es una firma sobre un dato. Queda
 * escrita en `precio_autorizado_por_id`, y por eso el director no lleva
 * comodín — si autorizara por ser director, esa columna dejaría de significar
 * algo.
 *
 * La misma línea se puede firmar desde el detalle de su venta. Lo que esta
 * pantalla agrega es verlas TODAS juntas con la plata en juego al lado: sin
 * ella, el director tendría que entrar venta por venta para encontrar qué está
 * frenado.
 *
 * Sirve hasta que se emite la factura. Después el trigger no deja tocar la
 * línea, así que la firma ocurre antes o no ocurre nunca.
 */
export function AprobacionesView() {
  const router = useRouter();
  const roles = useAuthStore((state) => state.roles);
  const puedeFirmar = roles.includes("DIRECTOR");

  const [firmando, setFirmando] = useState<LineaPendienteAutorizacion | null>(null);

  const { data: pendientes = [], isLoading, isError, refetch } = useGetAutorizacionesPendientes();
  const terceros = useMapaTerceros();
  const autorizar = useAutorizarPrecio();

  const enJuego = useMemo(
    () => pendientes.reduce((suma, linea) => suma + Number(linea.diferencia), 0),
    [pendientes],
  );

  const columnas = useMemo(
    () =>
      crearColumnasAprobaciones({
        onFirmar: (linea) => setFirmando(linea),
        onVerVenta: (linea) => router.push(`/dashboard/ventas/${linea.ventaId}`),
        nombreCliente: terceros.nombre,
        puedeFirmar,
      }),
    [router, terceros.nombre, puedeFirmar],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Aprobaciones de precio"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          titulo="Líneas esperando firma"
          valor={pendientes.length}
          formato="numero"
          icon={PenLine}
          isLoading={isLoading}
        />
        <KpiCard
          titulo="Margen en juego"
          valor={enJuego}
          formato="moneda"
          icon={TrendingDown}
          isLoading={isLoading}
        />
      </div>

      <DataTable
        columns={columnas}
        data={pendientes}
        isLoading={isLoading}
        isError={isError}
        onReintentar={() => void refetch()}
        onRowClick={(linea) => router.push(`/dashboard/ventas/${linea.ventaId}`)}
        mensajeVacio="No hay precios esperando firma."
      />

      {/* La confirmación dice la plata, no el trámite: es lo que se está
          decidiendo. */}
      <Modal
        open={firmando !== null}
        onOpenChange={(abierto) => !abierto && setFirmando(null)}
        titulo="Firmar el precio"
        descripcion={
          firmando
            ? `${firmando.producto} a ${formatCOP(firmando.precioUnitario)}, con piso de ${formatCOP(firmando.precioPiso)}. Se dejan de ganar ${formatCOP(firmando.diferencia)}. La firma queda con tu nombre y no cambia el precio ni los montos de la venta.`
            : undefined
        }
        labelConfirmar="Firmar"
        confirmarLoading={autorizar.isPending}
        onConfirmar={() => {
          if (!firmando) return;
          autorizar.mutate(firmando.ventaDetalleId, {
            onSuccess: () => setFirmando(null),
          });
        }}
      />
    </div>
  );
}
