"use client";

import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { cn, formatCOP } from "@/lib/utils";
import { CLASES_TONO, estadoEnPalabras, periodoEnPalabras } from "../lib/impuestos";
import type { FilaCalendario } from "../types/impuestos.types";

/** Una declaración en la columna de al lado: en qué va y su siguiente paso (presentar o pagar). */
export function TarjetaDeclaracion({
  fila,
  titulo,
  onPresentar,
  onPagar,
}: {
  fila: FilaCalendario;
  titulo: string;
  onPresentar: (f: FilaCalendario) => void;
  onPagar: (f: FilaCalendario) => void;
}) {
  const presenta = useTieneRol("DIRECTOR", "CONTADOR");
  const paga = useTieneRol("DIRECTOR", "CONTADOR", "CAJA");
  const e = estadoEnPalabras(fila);
  const estado = fila.situacion.estado;
  return (
    <section className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{titulo}</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="font-semibold">{periodoEnPalabras(fila.periodo)}</p>
        <p className="font-mono font-semibold whitespace-nowrap tabular-nums">{fila.valor === null ? "—" : formatCOP(fila.valor)}</p>
      </div>
      <span className={cn("mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", CLASES_TONO[e.tono])}>{e.texto}</span>
      {fila.declaracion?.recibo490 && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {fila.municipio ? "Recibo" : "Recibo 490"} · {fila.declaracion.recibo490}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {estado === "POR_PRESENTAR" && presenta && (
          <Button variant="outline" className="h-10 rounded-xl" onClick={() => onPresentar(fila)}>
            Ya la presenté
          </Button>
        )}
        {estado === "PRESENTADA" && paga && (
          <Button className="h-10 rounded-xl" onClick={() => onPagar(fila)}>
            Registrar pago
          </Button>
        )}
      </div>
    </section>
  );
}
