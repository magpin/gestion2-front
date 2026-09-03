"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { animate } from "framer-motion";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { cn, formatCOP } from "@/lib/utils";

// Reason: Recharts es pesado → se carga sólo cuando hay sparkline (§35.12).
const Sparkline = dynamic(
  () => import("@/components/shared/Sparkline").then((modulo) => modulo.Sparkline),
  { ssr: false },
);

type FormatoKpi = "moneda" | "numero";

interface KpiCardProps {
  titulo: string;
  valor: number;
  formato?: FormatoKpi;
  // Variación porcentual respecto al período anterior (positiva = alza).
  tendencia?: number;
  serie?: number[];
  icon?: LucideIcon;
  isLoading?: boolean;
}

function formatearValor(valor: number, formato: FormatoKpi): string {
  return formato === "moneda" ? formatCOP(valor) : new Intl.NumberFormat("es-CO").format(valor);
}

// KpiCard §19 — número grande con countUp, indicador de tendencia y sparkline opcional.
export function KpiCard({
  titulo,
  valor,
  formato = "numero",
  tendencia,
  serie,
  icon: Icon,
  isLoading = false,
}: KpiCardProps) {
  const [valorMostrado, setValorMostrado] = useState(0);
  // Reason: el countUp arranca desde el último valor mostrado, no desde 0 (evita el salto atrás al refetch).
  const valorPrevioRef = useRef(0);

  useEffect(() => {
    const motionReducido =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controles = animate(valorPrevioRef.current, valor, {
      duration: motionReducido ? 0 : 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (ultimo) => setValorMostrado(ultimo),
      onComplete: () => {
        valorPrevioRef.current = valor;
      },
    });
    return () => controles.stop();
  }, [valor]);

  if (isLoading) {
    return <SkeletonCard />;
  }

  const tendenciaPositiva = (tendencia ?? 0) >= 0;
  const IconoTendencia = tendenciaPositiva ? TrendingUp : TrendingDown;

  return (
    <Card className="gap-3 p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{titulo}</p>
        {Icon && <Icon size={16} strokeWidth={1.75} className="text-primary" />}
      </div>

      <p className="font-mono text-2xl font-semibold leading-none tracking-tight text-foreground">
        {formatearValor(Math.round(valorMostrado), formato)}
      </p>

      <div className="flex items-end justify-between gap-3">
        {typeof tendencia === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              tendenciaPositiva ? "text-primary" : "text-destructive",
            )}
          >
            <IconoTendencia size={13} strokeWidth={2} />
            {Math.abs(tendencia).toFixed(1)}%
          </span>
        )}
        {serie && serie.length > 1 && (
          <div className="h-10 flex-1">
            <Sparkline
              serie={serie}
              color={
                tendenciaPositiva ? "var(--chart-1)" : "var(--destructive)"
              }
            />
          </div>
        )}
      </div>
    </Card>
  );
}
