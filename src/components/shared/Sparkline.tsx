"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SparklineProps {
  serie: number[];
  color?: string;
}

// Sparkline minimalista — sin ejes ni grid ni fondo.
// Se importa con dynamic() desde KpiCard (§35.12) para no cargar Recharts en el bundle inicial.
export function Sparkline({ serie, color = "var(--chart-1)" }: SparklineProps) {
  const datos = serie.map((valor, indice) => ({ indice, valor }));
  // Reason: useId da un id estable entre renders; se quitan los ":" porque rompen url(#…) en SVG.
  const idGradiente = `spark-${useId().replace(/:/g, "")}`;

  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={datos} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="valor"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${idGradiente})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
