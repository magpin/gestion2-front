"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCOP } from "@/lib/utils";
import type { PuntoVenta } from "../types/dashboard.types";

interface VentasChartProps {
  serie: PuntoVenta[];
}

// Reason: id estable sin ":" para no romper url(#…) en el gradiente SVG.
// Gráfico de ventas por día del período, sin fondo (se apoya en la Card padre).
export function VentasChart({ serie }: VentasChartProps) {
  const idGradiente = `ventas-${useId().replace(/:/g, "")}`;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="etiqueta"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(valor: number) =>
            new Intl.NumberFormat("es-CO", { notation: "compact" }).format(valor)
          }
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--popover-foreground)",
          }}
          labelFormatter={(etiqueta) => `Día ${String(etiqueta)}`}
          formatter={(valor) => [
            typeof valor === "number" ? formatCOP(valor) : String(valor),
            "Ventas",
          ]}
        />
        <Area
          type="monotone"
          dataKey="valor"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill={`url(#${idGradiente})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
