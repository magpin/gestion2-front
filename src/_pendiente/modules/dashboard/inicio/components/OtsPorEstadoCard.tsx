"use client";

import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { OtEstadoConteo } from "../types/dashboard.types";

interface OtsPorEstadoCardProps {
  estados: OtEstadoConteo[];
}

// Distribución de OTs activas por estado del taller.
export function OtsPorEstadoCard({ estados }: OtsPorEstadoCardProps) {
  return (
    <Card className="gap-4 p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Órdenes de trabajo por estado
      </h2>

      {estados.length === 0 ? (
        <p className="text-sm text-muted-foreground/70">
          Sin órdenes activas en el período.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {estados.map((item) => (
            <li key={item.estado} className="flex items-center justify-between">
              <StatusBadge estado={item.estado} />
              <span className="font-mono text-sm font-semibold text-foreground">
                {item.cantidad}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
