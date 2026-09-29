"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Landmark } from "lucide-react";

import { SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { cn, formatCOP } from "@/lib/utils";
import { CLASES_TONO, estadoEnPalabras, fechaCorta } from "../lib/impuestos";
import { impuestosApi } from "../services/impuestos.service";
import type { FilaCalendario } from "../types/impuestos.types";
import { PagarDeclaracionDialog } from "./PagarDeclaracionDialog";

/**
 * Pagos → Por pagar: lo que se le debe a la DIAN y al municipio por
 * declaraciones ya presentadas (lienzo «Por pagar con la DIAN»). Si falla, no
 * tapa a los proveedores: simplemente no aparece, y Impuestos lo muestra.
 */
export function DeclaracionesPorPagar() {
  const paga = useTieneRol("DIRECTOR", "CONTADOR", "CAJA");
  const [pagando, setPagando] = useState<FilaCalendario | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["impuestos", "por-pagar"],
    queryFn: impuestosApi.porPagar,
    meta: SILENCIOSO,
  });
  if (data.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Landmark className="size-4" /> Impuestos por pagar
        </h2>
        <Link href="/dashboard/impuestos" className="text-sm font-semibold hover:underline">
          Ir a Impuestos
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {data.map((f) => {
          const e = estadoEnPalabras(f);
          return (
            <li key={f.declaracion!.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {f.etiqueta}
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium">
                    {f.municipio ? "Municipio" : "DIAN"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {f.formulario ? `Formulario ${f.formulario} · ` : ""}presentada el {fechaCorta(f.declaracion!.presentadaEl).toLowerCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm whitespace-nowrap">{f.vence ? fechaCorta(f.vence) : "Por confirmar"}</p>
                <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", CLASES_TONO[e.tono])}>
                  {e.texto}
                </span>
              </div>
              <p className="w-32 text-right font-mono font-semibold whitespace-nowrap tabular-nums">{formatCOP(f.valor ?? 0)}</p>
              {paga && (
                <Button className="h-9 rounded-lg px-4" onClick={() => setPagando(f)}>
                  Registrar pago
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <PagarDeclaracionDialog fila={pagando} onCerrar={() => setPagando(null)} />
    </section>
  );
}
