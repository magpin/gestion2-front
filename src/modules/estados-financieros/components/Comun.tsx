"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cn, formatCOP } from "@/lib/utils";
import { formatoPorcentaje, variacion } from "../lib/estados";
import type { Periodo } from "../types/estados.types";

/** Cómo se ve cada fila de un estado. */
export type TipoFila = "seccion" | "grupo" | "detalle" | "subtotal" | "total";

const FILA: Record<TipoFila, string> = {
  seccion: "border-t border-border bg-muted/40",
  grupo: "",
  detalle: "",
  subtotal: "border-t border-border bg-muted/40",
  total: "border-t-2 border-border bg-muted",
};

const ETIQUETA: Record<TipoFila, string> = {
  seccion: "py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground",
  grupo: "py-2 font-medium",
  detalle: "py-1 pl-10 font-normal text-muted-foreground",
  subtotal: "py-3 font-semibold",
  total: "py-3.5 text-base font-bold",
};

/** Una fila con su monto, lo comparado y la variación. Los montos no se parten nunca. */
export function Fila({
  tipo,
  etiqueta,
  valor,
  anterior,
  comparando,
  separada = false,
  abierta,
  onAlternar,
}: {
  tipo: TipoFila;
  etiqueta: ReactNode;
  valor?: number;
  /** Lo que valía en el período comparado; `undefined` si allá no existía. */
  anterior?: number;
  comparando: boolean;
  /** Una raya arriba, para separar bloques de grupos. */
  separada?: boolean;
  /** Si la fila tiene detalle: si se ve, y cómo abrirlo. */
  abierta?: boolean;
  onAlternar?: () => void;
}) {
  const monto = tipo === "detalle" ? "py-1 text-muted-foreground" : tipo === "grupo" ? "py-2" : "";
  const fuerte = tipo === "subtotal" || tipo === "total";
  return (
    <tr className={cn(FILA[tipo], separada && "border-t border-border")}>
      <th scope="row" className={cn("px-5 text-left font-sans", ETIQUETA[tipo])}>
        {onAlternar ? (
          <button
            type="button"
            aria-expanded={abierta}
            onClick={onAlternar}
            className="-ml-5 inline-flex items-center gap-1 pl-0.5 text-left hover:underline"
          >
            <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", abierta && "rotate-90")} />
            {etiqueta}
          </button>
        ) : (
          etiqueta
        )}
      </th>
      <td className={cn("px-3 py-3 text-right whitespace-nowrap", monto, fuerte ? "font-bold" : tipo !== "detalle" && "font-semibold")}>
        {valor === undefined ? "" : formatCOP(valor)}
      </td>
      {comparando && (
        <>
          <td className={cn("px-3 py-3 text-right whitespace-nowrap text-muted-foreground", monto)}>
            {valor === undefined ? "" : anterior === undefined ? "—" : formatCOP(anterior)}
          </td>
          <td className={cn("px-5 py-3 text-right whitespace-nowrap", monto, fuerte && "font-semibold")}>
            {valor === undefined ? "" : formatoPorcentaje(variacion(valor, anterior ?? 0))}
          </td>
        </>
      )}
    </tr>
  );
}

/** La tarjeta con la tabla de un estado: título, de qué período, y las columnas. */
export function TablaEstado({
  titulo,
  subtitulo,
  columnas,
  children,
}: {
  titulo: string;
  subtitulo: string;
  /** Los encabezados de los montos: el actual y, si se compara, el otro y la variación. */
  columnas: string[];
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 flex-1 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">{titulo}</h2>
        <p className="text-xs text-muted-foreground">{subtitulo}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <th scope="col" className="px-5 py-3 text-left">Concepto</th>
              {columnas.map((c, i) => (
                <th key={c} scope="col" className={cn("py-3 text-right whitespace-nowrap", i === columnas.length - 1 && columnas.length > 1 ? "px-5" : "px-3")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">{children}</tbody>
        </table>
      </div>
    </section>
  );
}

/** Una tarjeta chica del costado. */
export function Tarjeta({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Un renglón «etiqueta … cifra» de una tarjeta chica. */
export function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-[13px]">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="font-mono font-semibold whitespace-nowrap tabular-nums">{valor}</span>
    </div>
  );
}

const ESTADO_PERIODO: Record<Periodo["estado"], { punto: string; texto: string }> = {
  ABIERTO: { punto: "bg-success", texto: "Período abierto" },
  CERRADO: { punto: "bg-muted-foreground", texto: "Período cerrado" },
  SIN_PERIODO: { punto: "bg-warning", texto: "Sin período contable" },
};

/** «Período abierto · 214 asientos». */
export function EstadoPeriodo({ periodo }: { periodo: Periodo }) {
  const e = ESTADO_PERIODO[periodo.estado];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold">
      <span className={cn("size-2 rounded-full", e.punto)} />
      {e.texto} · {periodo.asientos.toLocaleString("es-CO")} {periodo.asientos === 1 ? "asiento" : "asientos"}
    </span>
  );
}

/** «del 1 al 30 de septiembre de 2026». */
export function rangoDelPeriodo(periodo: Periodo): string {
  const [anio, mes] = periodo.mes.split("-").map(Number);
  const nombre = new Date(anio, mes - 1, 1).toLocaleDateString("es-CO", { month: "long" });
  return `Del ${Number(periodo.desde.slice(8))} al ${Number(periodo.hasta.slice(8))} de ${nombre} de ${anio}`;
}
