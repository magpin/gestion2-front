"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { cn } from "@/lib/utils";
import type { FormaPagoBorrador } from "../lib/formaPago";
import { SelectorMedio, type Medio } from "./SelectorMedio";

/** «Mié 28 oct 2026», como en el diseño. */
export function fechaConDia(iso: string): string {
  const t = format(parseISO(iso), "EEE d MMM yyyy", { locale: es }).replace(".", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Los plazos que se ofrecen, en días. El habitual del tercero se suma si no está. */
export const PLAZOS = [0, 8, 15, 30, 45, 60, 90];

/**
 * «Plazo y pago» de la compra y la factura (pantallas 09, 10 y 13): Contado o
 * A crédito; a crédito, el plazo en días y el vence que calcula el sistema; de
 * contado, de qué caja o cuenta sale (o a cuál entra).
 *
 * Por debajo sigue siendo el `FormaPagoBorrador` de siempre: contado por caja
 * es EFECTIVO, contado por banco es TRANSFERENCIA.
 */
export function PlazoYPago({
  valor,
  onCambiar,
  plazo,
  onPlazo,
  plazoHabitual,
  quien,
  vence,
  medio: etiquetaMedio,
  cajaFija = false,
  soloCredito = false,
  motivoSoloCredito,
}: {
  valor: FormaPagoBorrador;
  onCambiar: (v: FormaPagoBorrador) => void;
  /** Días, como texto del selector. */
  plazo: string;
  onPlazo: (dias: string) => void;
  /** El plazo que el tercero da o recibe (PC25), o `null`. */
  plazoHabitual: number | null;
  /** «este cliente», «este proveedor»: para «Plazo habitual de …». */
  quien: string;
  /** El vence calculado, o `null`. */
  vence: string | null;
  /** «Sale de» en la compra, «Entra a» en la venta. */
  medio: string;
  cajaFija?: boolean;
  soloCredito?: boolean;
  motivoSoloCredito?: string;
}) {
  const credito = valor.modo === "CREDITO";
  const contado = valor.modo === "EFECTIVO" || valor.modo === "TRANSFERENCIA" || valor.modo === "REPARTIDO";
  const medioActual: Medio = valor.modo === "TRANSFERENCIA" ? "BANCO" : "CAJA";
  const plazos = [...new Set([...PLAZOS, ...(plazoHabitual === null ? [] : [plazoHabitual])])].sort((a, b) => a - b);

  const elegir = (modo: "CONTADO" | "CREDITO") =>
    onCambiar({ ...valor, modo: modo === "CREDITO" ? "CREDITO" : medioActual === "BANCO" ? "TRANSFERENCIA" : "EFECTIVO" });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-end gap-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Forma de pago</span>
          <div role="radiogroup" aria-label="Forma de pago" className="flex h-[52px] gap-1 rounded-xl border border-border bg-muted p-1">
            {(["CONTADO", "CREDITO"] as const).map((m) => {
              const activo = m === "CREDITO" ? credito : contado;
              const bloqueado = m === "CONTADO" && soloCredito;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  disabled={bloqueado}
                  title={bloqueado ? motivoSoloCredito : undefined}
                  onClick={() => elegir(m)}
                  className={cn(
                    "flex-1 rounded-[9.6px] text-sm font-semibold transition-colors disabled:opacity-40",
                    activo ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "CONTADO" ? "Contado" : "A crédito"}
                </button>
              );
            })}
          </div>
        </div>

        {credito && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Plazo</span>
              <select
                aria-label="Plazo"
                value={plazo}
                onChange={(e) => onPlazo(e.target.value)}
                className="h-[52px] w-full rounded-xl border border-input bg-card px-3.5 text-sm font-semibold"
              >
                {plazos.map((d) => (
                  <option key={d} value={String(d)}>
                    {d === 0 ? "Mismo día" : `${d} días`}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Vence</span>
              <div className="flex h-[52px] flex-col justify-center rounded-[9.6px] bg-muted px-3.5">
                <span className="text-sm font-semibold">{vence ? fechaConDia(vence) : "—"}</span>
                <span className="text-[11px] text-muted-foreground">
                  {plazoHabitual !== null && Number(plazo) === plazoHabitual
                    ? `Plazo habitual de ${quien}`
                    : "Lo calcula el sistema"}
                </span>
              </div>
            </div>
          </>
        )}

        {contado && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">{etiquetaMedio}</span>
            <SelectorMedio
              medio={medioActual}
              onMedio={(m) => onCambiar({ ...valor, modo: m === "BANCO" ? "TRANSFERENCIA" : "EFECTIVO" })}
              caja={valor.caja}
              onCaja={(caja) => onCambiar({ ...valor, caja })}
              cuenta={valor.cuenta}
              onCuenta={(cuenta) => onCambiar({ ...valor, cuenta })}
              cajaFija={cajaFija}
            />
          </div>
        )}
      </div>
      {soloCredito && motivoSoloCredito && <p className="text-xs text-muted-foreground">{motivoSoloCredito}</p>}
    </div>
  );
}
