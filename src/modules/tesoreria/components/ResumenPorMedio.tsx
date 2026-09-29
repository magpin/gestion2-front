"use client";

import { cn, formatCOP } from "@/lib/utils";
import type { ResumenDelMes } from "../types/resumen.types";

/**
 * La cabecera de Recibos y de Comprobantes: el total del mes y cuánto entró
 * o salió por cada caja y cuenta. Tocar un medio filtra la lista por él.
 */
export function ResumenPorMedio({
  titulo,
  pie,
  resumen,
  medio,
  onMedio,
  palabra,
}: {
  /** «Cobrado en septiembre». */
  titulo: string;
  /** «31 recibos · 1 anulado». */
  pie: string;
  resumen: ResumenDelMes;
  medio: string | null;
  onMedio: (id: string | null) => void;
  /** «recibos», «comprobantes»: lo que se cuenta en cada medio. */
  palabra: [string, string];
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{titulo}</p>
          <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">{formatCOP(resumen.total)}</p>
        </div>
        <p className="text-sm text-muted-foreground">{pie}</p>
      </div>
      {resumen.porMedio.length > 0 && (
        <div
          className="grid gap-px border-t border-border bg-border sm:[grid-template-columns:var(--columnas)]"
          style={{ "--columnas": `repeat(${Math.min(resumen.porMedio.length, 4)}, minmax(0, 1fr))` } as React.CSSProperties}
        >
          {resumen.porMedio.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={medio === m.id}
              onClick={() => onMedio(medio === m.id ? null : m.id)}
              className={cn("px-6 py-4 text-left transition-colors", medio === m.id ? "bg-accent" : "bg-card hover:bg-accent/60")}
            >
              <p className="text-sm font-semibold">{m.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {m.detalle} · {m.cantidad} {m.cantidad === 1 ? palabra[0] : palabra[1]}
              </p>
              <p className="mt-1 font-mono text-lg font-semibold whitespace-nowrap tabular-nums">{formatCOP(m.total)}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
