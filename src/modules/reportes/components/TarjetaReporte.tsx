"use client";

import { ArrowRight, CalendarRange, Clock, RectangleVertical } from "lucide-react";

import { ICONO_AREA } from "../lib/areas";
import { paginasCorto, ultimaVez } from "../lib/fechas";
import type { Reporte } from "../types/reportes.types";
import { MiniaturaHoja } from "./MiniaturaHoja";

/**
 * Un reporte que se puede sacar: cómo se ve, qué pregunta contesta, qué pide y
 * cómo sale.
 *
 * Toda la tarjeta es el botón. El único botón negro de la pantalla es el de
 * cada tarjeta, y dice qué va a pedir —el período o la fecha de corte— antes
 * de pedirlo.
 */
export function TarjetaReporte({
  reporte,
  etiquetaArea,
  hoy,
  onElegir,
}: {
  reporte: Reporte;
  etiquetaArea: string;
  /** `AAAA-MM-DD` en Colombia, para decir «Hoy» o «Ayer». */
  hoy: string | undefined;
  onElegir: () => void;
}) {
  const Icono = ICONO_AREA[reporte.area];
  const esRango = reporte.parametro === "RANGO";
  const horizontal = reporte.formato.orientacion === "HORIZONTAL";
  const sale = `Carta ${horizontal ? "horizontal" : "vertical"}${reporte.formato.firmas ? ", con firmas" : ""}`;

  return (
    <button
      type="button"
      onClick={onElegir}
      className="group flex flex-col overflow-hidden rounded-[1.05rem] border border-border bg-card text-left text-card-foreground transition-[border-color,box-shadow] duration-150 hover:border-[#b8b8b8] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f25623] dark:hover:border-[#4d4d4d]"
    >
      <div className="relative flex h-[268px] w-full items-center justify-center border-b border-border bg-[#e4e4e4] dark:bg-[#111111]">
        <span className="absolute top-3.5 left-3.5 z-10 inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs font-medium">
          <Icono className="size-[13px]" strokeWidth={2} aria-hidden />
          {etiquetaArea}
        </span>
        <span className="absolute top-3.5 right-3.5 font-mono text-[11px] text-muted-foreground">
          {paginasCorto(reporte.formato.paginas)}
        </span>
        <MiniaturaHoja reporte={reporte} />
      </div>

      <div className="flex w-full flex-col gap-4 px-[22px] pt-5 pb-[22px]">
        <div className="flex flex-col gap-1.5">
          <span className="text-lg font-semibold tracking-[-0.2px]">{reporte.etiqueta}</span>
          <span className="text-sm leading-[1.45] text-[#4d4d4d] dark:text-[#b8b8b8]">
            «{reporte.pregunta}»
          </span>
          <span className="text-xs text-muted-foreground">{reporte.trae}</span>
        </div>

        <dl className="grid grid-cols-3 gap-3.5 border-y border-border py-3.5">
          <Dato icono={<CalendarRange className="size-[13px]" aria-hidden />} rotulo="Pide">
            {esRango ? "Rango de fechas" : "Fecha de corte"}
          </Dato>
          <Dato
            icono={
              <RectangleVertical
                className={`size-[13px] ${horizontal ? "rotate-90" : ""}`}
                aria-hidden
              />
            }
            rotulo="Sale"
          >
            {sale}
          </Dato>
          <Dato icono={<Clock className="size-[13px]" aria-hidden />} rotulo="Última vez">
            {reporte.ultimaVez && hoy ? (
              <span className="font-mono">{ultimaVez(reporte.ultimaVez, hoy)}</span>
            ) : (
              "Nunca"
            )}
          </Dato>
        </dl>

        <span className="inline-flex h-[42px] items-center justify-between rounded-[0.6rem] bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/90">
          {esRango ? "Elegir el período" : "Elegir la fecha de corte"}
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </button>
  );
}

function Dato({
  icono,
  rotulo,
  children,
}: {
  icono: React.ReactNode;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icono}
        {rotulo}
      </dt>
      <dd className="m-0 text-[13px] leading-[1.35] font-medium">{children}</dd>
    </div>
  );
}

/** Un área del negocio que todavía no tiene reportes. Se muestra igual: el mapa completo. */
export function AreaSinReportes({ area, etiqueta }: { area: Reporte["area"]; etiqueta: string }) {
  const Icono = ICONO_AREA[area];
  return (
    <div className="flex items-center gap-3.5 rounded-[1.05rem] border border-dashed border-border bg-card p-[18px]">
      <span className="flex h-14 w-11 shrink-0 items-center justify-center rounded-[3px] border border-dashed border-[#b8b8b8] dark:border-[#4d4d4d]">
        <Icono className="size-[18px] text-muted-foreground" strokeWidth={1.8} aria-hidden />
      </span>
      <span className="flex flex-col gap-[3px]">
        <span className="text-sm font-semibold">{etiqueta}</span>
        <span className="text-xs leading-[1.4] text-muted-foreground">
          Todavía no tiene reportes.
        </span>
      </span>
    </div>
  );
}
