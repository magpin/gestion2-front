"use client";

import { useMemo } from "react";
import { CalendarCheck, CalendarRange, Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { Card } from "@/components/ui/card";
import { ChartCard } from "@/components/shared/ChartCard";
import { cn, formatFecha } from "@/lib/utils";
import { useGetPeriodos } from "../hooks/usePeriodos";
import type { EstadoPeriodo } from "../types/periodos.types";

const BADGE: Record<EstadoPeriodo, string> = {
  ABIERTO: "bg-success/12 text-success",
  CERRADO: "bg-muted text-muted-foreground",
  REABIERTO: "bg-warning/12 text-warning",
};

export function PeriodosContadorView() {
  const { data: periodos, isLoading } = useGetPeriodos();

  const abierto = useMemo(
    () => periodos?.find((p) => p.estado === "ABIERTO"),
    [periodos],
  );
  const numCerrados = useMemo(
    () => periodos?.filter((p) => p.estado === "CERRADO").length ?? 0,
    [periodos],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Períodos — referencia"
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="gap-3 p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">Período abierto</p>
              <CalendarCheck
                size={18}
                strokeWidth={1.5}
                className="text-muted-foreground/70"
              />
            </div>
            <p className="text-lg font-semibold leading-tight text-foreground">
              {abierto?.nombre ?? "Ninguno"}
            </p>
            {abierto && (
              <p className="text-xs text-muted-foreground/70">
                {formatFecha(abierto.fechaInicio)} —{" "}
                {formatFecha(abierto.fechaFin)}
              </p>
            )}
          </Card>
          <KpiCard
            titulo="Total de períodos"
            valor={periodos?.length ?? 0}
            formato="numero"
            icon={CalendarRange}
          />
          <KpiCard
            titulo="Períodos cerrados"
            valor={numCerrados}
            formato="numero"
            icon={Lock}
          />
        </div>
      )}

      <ChartCard
        titulo="Períodos contables"
        descripcion="Listado de períodos y su estado."
      >
        {!periodos || periodos.length === 0 ? (
          <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground/70">
            Aún no hay períodos contables.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Período</th>
                  <th className="py-2 pr-4 font-medium">Inicio</th>
                  <th className="py-2 pr-4 font-medium">Fin</th>
                  <th className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="py-2 pr-4 text-foreground">{p.nombre}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {formatFecha(p.fechaInicio)}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {formatFecha(p.fechaFin)}
                    </td>
                    <td className="py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          BADGE[p.estado],
                        )}
                      >
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
