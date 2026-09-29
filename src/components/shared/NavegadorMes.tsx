"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { moverMes, nombreMes } from "@/modules/gastos/lib/mes";

/** El mes que se está mirando, con sus flechas. No pasa de `maximo` (el mes de hoy). */
export function NavegadorMes({ mes, onMes, maximo }: { mes: string; onMes: (m: string) => void; maximo?: string }) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
      <Button type="button" variant="ghost" className="size-9 rounded-xl p-0" aria-label="Mes anterior" onClick={() => onMes(moverMes(mes, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-36 text-center text-sm font-semibold">{nombreMes(mes)}</span>
      <Button
        type="button"
        variant="ghost"
        className="size-9 rounded-xl p-0"
        aria-label="Mes siguiente"
        disabled={maximo !== undefined && mes >= maximo}
        onClick={() => onMes(moverMes(mes, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
