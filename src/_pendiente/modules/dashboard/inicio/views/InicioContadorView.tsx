"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChartCard } from "@/components/shared/ChartCard";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCOP } from "@/lib/utils";
import { useGetAlertas, useGetDashboard } from "../hooks/useDashboard";
import { useGetCarteraProveedores } from "@/modules/dashboard/compras/hooks/useCompras";
import { useMapaTerceros } from "@/modules/dashboard/lookups/useMapas";
import { PeriodoSelector } from "../components/PeriodoSelector";
import { AlertasStack } from "../components/AlertasStack";
import type { PeriodoDashboard } from "../types/dashboard.types";
// ⚠️ MOCK TEMPORAL — registrado en frontend/MOCKS-CONTADOR.md. Borrar con su uso.
// El aging de proveedores salió de acá: la cartera real no lo tiene.
import { DASHBOARD_CONTADOR_MOCK } from "../mocks/dashboard-contador.mock";

const compacto = (valor: number) =>
  new Intl.NumberFormat("es-CO", { notation: "compact" }).format(valor);

// Formateador para LabelList (recibe string | number | undefined).
const labelCompacto = (label: unknown) =>
  typeof label === "number" ? compacto(label) : String(label ?? "");

const configIngresos = {
  valor: { label: "Ingresos", color: "var(--chart-4)" },
} satisfies ChartConfig;

const configFinanciero = {
  monto: { label: "Monto", color: "var(--chart-1)" },
} satisfies ChartConfig;

// El contador aterriza en un panorama financiero de solo lectura (no operativo).
// Reutiliza /dashboard (periodo) + /compras/cartera (por pagar).
export function InicioContadorView() {
  const [periodo, setPeriodo] = useState<PeriodoDashboard>("mes");
  const {
    data: resumenReal,
    isLoading,
    isError,
    refetch,
  } = useGetDashboard(periodo);
  const { data: alertas, isError: alertasError, refetch: refetchAlertas } =
    useGetAlertas();
  const { data: carteraProv } = useGetCarteraProveedores();
  const terceros = useMapaTerceros();

  // ⚠️ MOCK TEMPORAL — solo si NEXT_PUBLIC_MOCK_CONTADOR=1 y no hay datos reales.
  const usarMock =
    process.env.NEXT_PUBLIC_MOCK_CONTADOR === "1" &&
    (!resumenReal || resumenReal.ventas.numVentas === 0);
  const resumen = usarMock ? DASHBOARD_CONTADOR_MOCK : resumenReal;

  // `GET /compras/cartera` devuelve el listado de compras con saldo, no tramos
  // de antigüedad: el modelo no guarda vencimiento —la compra no pacta plazo—
  // así que un aging 0-30/31-60 saldría de una fecha inventada.
  const comprasConSaldo = useMemo(() => carteraProv?.datos ?? [], [carteraProv]);
  const porPagar = useMemo(
    () => comprasConSaldo.reduce((suma, compra) => suma + compra.saldoPendiente, 0),
    [comprasConSaldo],
  );

  const datosFinancieros = useMemo(
    () => [
      { concepto: "Ingresos", monto: resumen?.financiero.ingresos ?? 0 },
      { concepto: "Gastos", monto: resumen?.financiero.gastos ?? 0 },
      { concepto: "Utilidad", monto: resumen?.financiero.utilidadBruta ?? 0 },
    ],
    [resumen],
  );

  /** Los cinco proveedores a los que más se les debe. Se agrupa en el navegador. */
  const datosPorPagar = useMemo(() => {
    const porProveedor = new Map<string, number>();
    for (const compra of comprasConSaldo) {
      const acumulado = porProveedor.get(compra.terceroId) ?? 0;
      porProveedor.set(compra.terceroId, acumulado + compra.saldoPendiente);
    }
    return [...porProveedor.entries()]
      .map(([terceroId, monto]) => ({ rango: terceros.nombre(terceroId), monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);
  }, [comprasConSaldo, terceros]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Inicio — panorama financiero"
        acciones={<PeriodoSelector periodo={periodo} onChange={setPeriodo} />}
      />

      {isError ? (
        <EmptyState
          icon={AlertCircle}
          titulo="No se pudo cargar el panorama"
          descripcion="Verifica tu conexión e intenta de nuevo."
          accion={{ label: "Reintentar", onClick: () => void refetch() }}
        />
      ) : isLoading || !resumen ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={`sk-${i}`} />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              titulo="Ingresos del período"
              valor={resumen.financiero.ingresos}
              formato="moneda"
              serie={resumen.ventasPorDia.map((p) => p.valor)}
              icon={ArrowUpRight}
            />
            <KpiCard
              titulo="Gastos del período"
              valor={resumen.financiero.gastos}
              formato="moneda"
              icon={ArrowDownRight}
            />
            <KpiCard
              titulo="Utilidad bruta"
              valor={resumen.financiero.utilidadBruta}
              formato="moneda"
              icon={TrendingUp}
            />
            <KpiCard
              titulo="N.º de ventas"
              valor={resumen.ventas.numVentas}
              formato="numero"
              icon={Receipt}
            />
            <KpiCard
              titulo="Por cobrar (vencida)"
              valor={resumen.carteraVencida}
              formato="moneda"
              icon={Wallet}
            />
            <KpiCard
              titulo="Por pagar (proveedores)"
              valor={porPagar}
              formato="moneda"
              icon={Wallet}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              titulo="Ingresos por día"
              descripcion="Evolución de los ingresos del período."
              className="lg:col-span-2"
            >
              {resumen.ventasPorDia.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground/70">
                  Sin ingresos en el período.
                </div>
              ) : (
                <ChartContainer
                  config={configIngresos}
                  className="h-[280px] w-full"
                >
                  <AreaChart
                    accessibilityLayer
                    data={resumen.ventasPorDia}
                    margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
                  >
                    <defs>
                      <linearGradient
                        id="fillIngresos"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-valor)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-valor)"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="etiqueta"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
                      tickFormatter={(v: string) => v.slice(8)}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={compacto}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          formatter={(valor) =>
                            typeof valor === "number"
                              ? formatCOP(valor)
                              : String(valor)
                          }
                        />
                      }
                    />
                    <Area
                      type="natural"
                      dataKey="valor"
                      stroke="var(--color-valor)"
                      fill="url(#fillIngresos)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </ChartCard>

            {alertasError ? (
              <EmptyState
                icon={AlertCircle}
                titulo="No se pudieron cargar las alertas"
                accion={{
                  label: "Reintentar",
                  onClick: () => void refetchAlertas(),
                }}
              />
            ) : (
              <AlertasStack alertas={alertas ?? []} />
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              titulo="Ingresos vs. gastos"
              descripcion="Resultado del período."
            >
              <ChartContainer
                config={configFinanciero}
                className="h-[240px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={datosFinancieros}
                  margin={{ top: 20, left: 8, right: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="concepto"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={compacto}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        nameKey="concepto"
                        formatter={(valor) =>
                          typeof valor === "number"
                            ? formatCOP(valor)
                            : String(valor)
                        }
                      />
                    }
                  />
                  <Bar dataKey="monto" fill="var(--color-monto)" radius={5}>
                    <LabelList
                      dataKey="monto"
                      position="top"
                      offset={8}
                      className="fill-foreground"
                      fontSize={11}
                      formatter={labelCompacto}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </ChartCard>

            <ChartCard
              titulo="Por pagar a proveedores"
              descripcion="Saldo por proveedor, los cinco más altos."
            >
              {datosPorPagar.length === 0 ? (
                <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground/70">
                  Sin cartera por pagar.
                </div>
              ) : (
                <ChartContainer
                  config={configFinanciero}
                  className="h-[240px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={datosPorPagar}
                    margin={{ top: 20, left: 8, right: 8 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="rango"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={compacto}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          nameKey="rango"
                          formatter={(valor) =>
                            typeof valor === "number"
                              ? formatCOP(valor)
                              : String(valor)
                          }
                        />
                      }
                    />
                    <Bar dataKey="monto" fill="var(--color-monto)" radius={5}>
                      <LabelList
                        dataKey="monto"
                        position="top"
                        offset={8}
                        className="fill-foreground"
                        fontSize={11}
                        formatter={labelCompacto}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </ChartCard>
          </section>
        </>
      )}
    </div>
  );
}
