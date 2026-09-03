"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Clock, PackageX, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  AlertaDashboard,
  PrioridadAlerta,
  TipoAlerta,
} from "../types/dashboard.types";

interface AlertasStackProps {
  alertas: AlertaDashboard[];
}

const ICONO_POR_TIPO: Record<TipoAlerta, LucideIcon> = {
  STOCK_CRITICO: PackageX,
  OT_VENCIDA: Clock,
  CARTERA_VENCIDA: Wallet,
};

const COLOR_POR_PRIORIDAD: Record<PrioridadAlerta, string> = {
  alta: "text-destructive bg-destructive/12",
  media: "text-warning bg-warning/12",
  baja: "text-muted-foreground/70 bg-muted",
};

// Stack de alertas operativas (stock crítico, OT vencidas, cartera vencida).
export function AlertasStack({ alertas }: AlertasStackProps) {
  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Alertas</h2>
        {alertas.length > 0 && (
          <span className="rounded-full bg-destructive/12 px-2 py-0.5 font-mono text-xs font-semibold text-destructive">
            {alertas.length}
          </span>
        )}
      </div>

      {alertas.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
          <AlertTriangle size={16} strokeWidth={1.5} />
          Sin alertas activas.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {alertas.map((alerta) => {
            // Reason: el tipo llega por red → fallback si el backend agrega un TipoAlerta nuevo.
            const Icono = ICONO_POR_TIPO[alerta.tipo] ?? AlertTriangle;
            return (
              <li key={`${alerta.tipo}-${alerta.id}`} className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    COLOR_POR_PRIORIDAD[alerta.prioridad],
                  )}
                >
                  <Icono size={16} strokeWidth={1.75} />
                </span>
                <p className="pt-1 text-sm text-muted-foreground">
                  {alerta.descripcion}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
