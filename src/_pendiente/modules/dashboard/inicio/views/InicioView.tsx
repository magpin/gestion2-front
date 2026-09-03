"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  Boxes,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useGetAlertas, useGetDashboard } from "../hooks/useDashboard";
import { PeriodoSelector } from "../components/PeriodoSelector";
import { OtsPorEstadoCard } from "../components/OtsPorEstadoCard";
import { TopClientesCard } from "../components/TopClientesCard";
import { AlertasStack } from "../components/AlertasStack";
import type { PeriodoDashboard } from "../types/dashboard.types";

// Reason: Recharts es pesado → el gráfico se carga sólo en cliente, fuera del bundle inicial.
const VentasChart = dynamic(
  () => import("../components/VentasChart").then((modulo) => modulo.VentasChart),
  { ssr: false, loading: () => <SkeletonCard /> },
);

export function InicioView() {
  // Reason: el período es estado de UI puro (no de servidor) → useState es correcto aquí.
  const [periodo, setPeriodo] = useState<PeriodoDashboard>("mes");

  const { data: resumen, isLoading, isError, refetch } = useGetDashboard(periodo);
  const {
    data: alertas,
    isError: alertasError,
    refetch: refetchAlertas,
  } = useGetAlertas();

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Inicio"
        acciones={<PeriodoSelector periodo={periodo} onChange={setPeriodo} />}
      />

      {isError ? (
        <EmptyState
          icon={AlertCircle}
          titulo="No se pudo cargar el dashboard"
          descripcion="Verifica tu conexión e intenta de nuevo."
          accion={{ label: "Reintentar", onClick: () => void refetch() }}
        />
      ) : isLoading || !resumen ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, indice) => (
            <SkeletonCard key={`skeleton-kpi-${indice}`} />
          ))}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              titulo="Ventas del período"
              valor={resumen.ventas.totalVentas}
              formato="moneda"
              serie={resumen.ventasPorDia.map((punto) => punto.valor)}
              icon={ShoppingCart}
            />
            <KpiCard
              titulo="N.º de ventas"
              valor={resumen.ventas.numVentas}
              formato="numero"
              icon={Receipt}
            />
            <KpiCard
              titulo="Ticket promedio"
              valor={resumen.ventas.ticketPromedio}
              formato="moneda"
              icon={TrendingUp}
            />
            <KpiCard
              titulo="Utilidad bruta"
              valor={resumen.financiero.utilidadBruta}
              formato="moneda"
              icon={Wallet}
            />
            <KpiCard
              titulo="Cartera vencida"
              valor={resumen.carteraVencida}
              formato="moneda"
              icon={AlertCircle}
            />
            <KpiCard
              titulo="OT pendientes"
              valor={resumen.taller.otPendientes}
              formato="numero"
              icon={Wrench}
            />
            <KpiCard
              titulo="Productos bajo mínimo"
              valor={resumen.inventario.productosBajoMinimo}
              formato="numero"
              icon={Package}
            />
            <KpiCard
              titulo="Valor de inventario"
              valor={resumen.inventario.valorInventario}
              formato="moneda"
              icon={Boxes}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="gap-4 p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold text-foreground">
                Ventas por día
              </h2>
              {resumen.ventasPorDia.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground/70">
                  Sin ventas en el período.
                </div>
              ) : (
                <VentasChart serie={resumen.ventasPorDia} />
              )}
            </Card>

            {alertasError ? (
              <EmptyState
                icon={AlertCircle}
                titulo="No se pudieron cargar las alertas"
                accion={{ label: "Reintentar", onClick: () => void refetchAlertas() }}
              />
            ) : (
              <AlertasStack alertas={alertas ?? []} />
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OtsPorEstadoCard estados={resumen.otsPorEstado} />
            <TopClientesCard clientes={resumen.topClientes} />
          </section>
        </>
      )}
    </div>
  );
}
