"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { BookOpen, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { ChartCard } from "@/components/shared/ChartCard";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  RangoSelector,
  rangoDePreset,
  type PresetRango,
} from "@/components/shared/RangoSelector";
import { formatCOP } from "@/lib/utils";
import { useEstadisticasAsientos } from "../hooks/useEstadisticasAsientos";

const compacto = (valor: number) =>
  new Intl.NumberFormat("es-CO", { notation: "compact" }).format(valor);

const labelCompacto = (label: unknown) =>
  typeof label === "number" ? compacto(label) : String(label ?? "");

const PALETA = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const configDiario = {
  debitos: { label: "Débitos", color: "var(--chart-1)" },
  creditos: { label: "Créditos", color: "var(--chart-2)" },
} satisfies ChartConfig;

const configMov = {
  movimiento: { label: "Movimiento", color: "var(--chart-3)" },
  cantidad: { label: "Asientos" },
} satisfies ChartConfig;

export function AsientosContadorView() {
  const [preset, setPreset] = useState<PresetRango>("mes");
  const rango = useMemo(() => rangoDePreset(preset), [preset]);
  const { data, isLoading } = useEstadisticasAsientos(rango);

  const kpis = data?.kpis;

  const datosOrigen = useMemo(
    () =>
      (data?.porOrigen ?? []).map((o, i) => ({
        origen: o.origen,
        cantidad: o.cantidad,
        fill: PALETA[i % PALETA.length],
      })),
    [data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Asientos — análisis"
        descripcion="Indicadores del libro diario para el período seleccionado."
        acciones={<RangoSelector preset={preset} onPresetChange={setPreset} />}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            titulo="N.º de asientos"
            valor={kpis?.numAsientos ?? 0}
            formato="numero"
            icon={BookOpen}
          />
          <KpiCard
            titulo="Total debitado"
            valor={kpis?.totalDebitos ?? 0}
            formato="moneda"
            icon={TrendingUp}
          />
          <KpiCard
            titulo="Total acreditado"
            valor={kpis?.totalCreditos ?? 0}
            formato="moneda"
            icon={TrendingDown}
          />
          <KpiCard
            titulo="Descuadre"
            valor={kpis?.descuadre ?? 0}
            formato="moneda"
            icon={Scale}
          />
        </div>
      )}

      <ChartCard
        titulo="Débitos vs. créditos por día"
        descripcion="En una contabilidad sana ambas curvas coinciden (partida doble)."
      >
        <ChartContainer config={configDiario} className="h-[280px] w-full">
          <LineChart
            accessibilityLayer
            data={data?.porDia ?? []}
            margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          >
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
                  formatter={(valor) =>
                    typeof valor === "number" ? formatCOP(valor) : String(valor)
                  }
                />
              }
            />
            <Line
              dataKey="debitos"
              type="monotone"
              stroke="var(--color-debitos)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="creditos"
              type="monotone"
              stroke="var(--color-creditos)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          titulo="Asientos por origen"
          descripcion="De dónde proviene cada asiento del período."
        >
          <ChartContainer
            config={configMov}
            className="mx-auto aspect-square max-h-[280px] [&_.recharts-pie-label-text]:fill-foreground"
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent hideLabel nameKey="origen" />}
              />
              <Pie
                data={datosOrigen}
                dataKey="cantidad"
                nameKey="origen"
                innerRadius={55}
                paddingAngle={2}
                label={({ value }: { value?: number }) =>
                  value != null ? String(value) : ""
                }
              />
              <ChartLegend
                content={<ChartLegendContent nameKey="origen" />}
                className="-translate-y-2 flex-wrap gap-2 [&>*]:justify-center"
              />
            </PieChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          titulo="Cuentas más movidas"
          descripcion="Mayor movimiento (débitos + créditos) del período."
        >
          <ChartContainer config={configMov} className="h-[280px] w-full">
            <BarChart
              accessibilityLayer
              data={data?.cuentasMovidas ?? []}
              layout="vertical"
              margin={{ left: 8, right: 48 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="cuenta"
                tickLine={false}
                axisLine={false}
                width={160}
                tick={{ fontSize: 10 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    nameKey="cuenta"
                    formatter={(valor) =>
                      typeof valor === "number"
                        ? formatCOP(valor)
                        : String(valor)
                    }
                  />
                }
              />
              <Bar
                dataKey="movimiento"
                fill="var(--color-movimiento)"
                radius={5}
              >
                <LabelList
                  dataKey="movimiento"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={11}
                  formatter={labelCompacto}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </ChartCard>
      </div>
    </div>
  );
}
