"use client";

import { cn } from "@/lib/utils";
import { PERIODOS, type PeriodoDashboard } from "../types/dashboard.types";

interface PeriodoSelectorProps {
  periodo: PeriodoDashboard;
  onChange: (periodo: PeriodoDashboard) => void;
}

// Selector segmentado del período del dashboard (Hoy / Semana / Mes / Año).
export function PeriodoSelector({ periodo, onChange }: PeriodoSelectorProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1">
      {PERIODOS.map((opcion) => {
        const activo = opcion.id === periodo;
        return (
          <button
            key={opcion.id}
            type="button"
            onClick={() => onChange(opcion.id)}
            aria-pressed={activo}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              activo
                ? "bg-card font-semibold text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opcion.label}
          </button>
        );
      })}
    </div>
  );
}
