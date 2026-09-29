"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CircleCheck, Landmark, TriangleAlert } from "lucide-react";

import { SILENCIOSO } from "@/components/shared/ErrorCarga";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { cn, formatCOP } from "@/lib/utils";
import { fechaCorta } from "../lib/impuestos";
import { impuestosApi } from "../services/impuestos.service";
import type { AvisoImpuestos } from "../types/impuestos.types";
import { PagarDeclaracionDialog } from "./PagarDeclaracionDialog";

const ESTILO: Record<AvisoImpuestos["tipo"], { caja: string; icono: typeof Landmark; marca: string }> = {
  POR_PRESENTAR: { caja: "border-border", icono: CalendarDays, marca: "bg-muted" },
  POR_PAGAR: { caja: "border-warning/40", icono: Landmark, marca: "bg-warning/15" },
  VENCE_HOY: { caja: "border-danger/30 bg-danger/5", icono: TriangleAlert, marca: "bg-card text-danger" },
  VENCIDA: { caja: "border-danger/30", icono: TriangleAlert, marca: "bg-danger/10 text-danger" },
  PAGADA: { caja: "border-success/30", icono: CircleCheck, marca: "bg-success/15" },
};

/**
 * El aviso de impuestos en Inicio (lienzo «La DIAN en Inicio»): la
 * declaración más urgente, con lo que se puede hacer ya. No sale si no hay
 * nada que decir; la recién pagada se va sola a los tres días.
 */
export function AvisoImpuestosInicio() {
  const paga = useTieneRol("DIRECTOR", "CONTADOR", "CAJA");
  // Los mismos roles que leen Impuestos en el backend: a CAJA la pantalla le da
  // 403, así que no se le ofrece el enlace.
  const ve = useTieneRol("DIRECTOR", "CONTADOR", "CONSULTA");
  const [pagando, setPagando] = useState(false);
  const { data } = useQuery({ queryKey: ["impuestos", "aviso"], queryFn: impuestosApi.aviso, meta: SILENCIOSO });
  if (!data) return null;

  const { tipo, fila } = data;
  const e = ESTILO[tipo];
  const Icono = e.icono;
  const d = fila.declaracion;
  const cuando = fila.vence ? `el ${fechaCorta(fila.vence).toLowerCase()}` : "la fecha del calendario";
  const titulo: Record<AvisoImpuestos["tipo"], string> = {
    POR_PRESENTAR: `${fila.etiqueta} · falta presentarla`,
    POR_PAGAR: `${fila.etiqueta} · vence en ${fila.situacion.dias} ${fila.situacion.dias === 1 ? "día" : "días"}`,
    VENCE_HOY: `${fila.etiqueta} · vence hoy`,
    VENCIDA: `${fila.etiqueta} · vencida hace ${-(fila.situacion.dias ?? 0)} ${fila.situacion.dias === -1 ? "día" : "días"}`,
    PAGADA: `${fila.etiqueta} · pagada`,
  };
  const detalle: Record<AvisoImpuestos["tipo"], string> = {
    POR_PRESENTAR:
      fila.situacion.dias === null
        ? "El período ya cerró: presentala en MUISCA y registrala en Impuestos."
        : `El borrador sale del libro. Presentala en MUISCA antes del ${fila.vence ? fechaCorta(fila.vence).toLowerCase() : "vencimiento"}.`,
    POR_PAGAR: `${fila.formulario ? `Formulario ${fila.formulario} ` : ""}presentado${d ? ` el ${fechaCorta(d.presentadaEl).toLowerCase()}` : ""}. Falta pagarlo antes de ${cuando}.`,
    VENCE_HOY: "Pagala hoy en el banco o por PSE con el recibo 490, y registrá el pago.",
    VENCIDA: d
      ? "Ya corren intereses de mora: MUISCA liquida el valor a pagar hoy."
      : "Ya corren intereses de mora y sanción por extemporaneidad: presentala cuanto antes.",
    PAGADA: `${d?.recibo490 ? `Con el recibo 490 · ${d.recibo490}. ` : ""}El aviso se va solo en unos días.`,
  };
  const puedePagar = paga && d !== null && d.estado === "PRESENTADA";

  return (
    <section className={cn("flex flex-wrap items-center gap-4 rounded-3xl border bg-card px-5 py-4 shadow-sm", e.caja)}>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", e.marca)}>
        <Icono className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold", tipo === "VENCIDA" && "text-danger")}>{titulo[tipo]}</p>
        <p className="text-sm text-muted-foreground">{detalle[tipo]}</p>
      </div>
      <p className="font-mono text-lg font-semibold whitespace-nowrap tabular-nums">
        {formatCOP(fila.valor ?? 0)}
        {tipo === "VENCIDA" && " + mora"}
      </p>
      {puedePagar && tipo !== "PAGADA" ? (
        <Button className="h-10 rounded-xl px-5" onClick={() => setPagando(true)}>
          Registrar pago
        </Button>
      ) : !ve ? null : (
        <Link
          href={fila.obligacion === "RETENCION" ? "/dashboard/impuestos?pestana=retencion" : "/dashboard/impuestos"}
          className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-xl px-5")}
        >
          {tipo === "PAGADA" ? "Ver en Impuestos" : "Ir a Impuestos"}
        </Link>
      )}
      <PagarDeclaracionDialog fila={pagando ? fila : null} onCerrar={() => setPagando(false)} />
    </section>
  );
}
