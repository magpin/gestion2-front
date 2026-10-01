"use client";

import { useLayoutEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";

import { CampoPesos, CampoPrecio } from "@/components/shared/CampoNumero";
import { Button } from "@/components/ui/button";
import { cn, formatCOP, formatCOPExacto } from "@/lib/utils";
import { renglonRepartoVacio, type AnticipoDisponible, type RenglonReparto } from "../lib/formaPago";
import { CajaPrincipal } from "./CajaPrincipal";
import { SelectorCaja } from "./SelectorCaja";
import { SelectorCuentaBancaria } from "./SelectorCuentaBancaria";

/** Lo que suman los valores digitados, en centavos enteros: `0.1 + 0.2` no da `0.3`. */
export function sumaDigitada(renglones: readonly RenglonReparto[]): number {
  return (
    renglones.reduce((t, r) => t + Math.round(Number(r.valor || 0) * 100), 0) /
    100
  );
}

/**
 * Cuánto falta o sobra del reparto contra el total. Con un renglón en blanco,
 * ese se lleva el resto y no falta nada; sin ninguno, lo digitado tiene que
 * dar el total exacto.
 */
export function estadoDelReparto(
  renglones: readonly RenglonReparto[],
  total: number,
): { resto: number; falta: number; sobra: number } {
  const diferencia = Math.round((total - sumaDigitada(renglones)) * 100) / 100;
  const hayAbierto = renglones.some((r) => r.medio !== "ANTICIPO" && r.valor.trim() === "");
  return {
    resto: hayAbierto && diferencia > 0 ? diferencia : 0,
    falta: !hayAbierto && diferencia > 0 ? diferencia : 0,
    sobra: diferencia < 0 ? -diferencia : 0,
  };
}

/**
 * El pago repartido: cada medio en su tarjeta —arriba Caja o Banco y quitar;
 * abajo cuál y cuánto—. El valor baja debajo del selector cuando no cabe, así
 * que nunca aparece una barra horizontal. Uno en blanco se lleva el resto.
 * Mínimo dos medios.
 *
 * Con `total` dice cuánto falta repartir o cuánto se pasó. Es una estimación:
 * el total exacto (IVA, retenciones) lo decide el servidor.
 */
export function RepartoEnTarjetas({
  renglones,
  onCambiar,
  total,
  cajaFija = false,
  anticipos = [],
}: {
  /** Los anticipos del cliente: con alguno, un renglón puede ser de anticipo. */
  anticipos?: AnticipoDisponible[];
  renglones: RenglonReparto[];
  onCambiar: (renglones: RenglonReparto[]) => void;
  total?: number | null;
  /** La caja no se elige: la principal (lo que entra por ventas). */
  cajaFija?: boolean;
}) {
  // La caja principal se elige sola en cada renglón, y dos renglones de caja
  // lo harían en el mismo instante: sin esto, el segundo cambio pisaría al
  // primero con la lista vieja.
  const ultimo = useRef(renglones);
  useLayoutEffect(() => {
    ultimo.current = renglones;
  }, [renglones]);
  const cambiar = (siguientes: RenglonReparto[]) => {
    ultimo.current = siguientes;
    onCambiar(siguientes);
  };
  const cambiarRenglon = (clave: number, cambio: Partial<RenglonReparto>) =>
    cambiar(ultimo.current.map((r) => (r.clave === clave ? { ...r, ...cambio } : r)));

  const estado =
    total === undefined || total === null ? null : estadoDelReparto(renglones, total);

  return (
    <div className="@container flex flex-col gap-3">
      {renglones.map((r, i) => (
        <div key={r.clave} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div
              role="radiogroup"
              aria-label={`Medio ${i + 1}`}
              className="inline-flex h-10 w-fit gap-1 rounded-xl border border-border bg-muted p-1"
            >
              {(anticipos.length > 0 ? (["CAJA", "BANCO", "ANTICIPO"] as const) : (["CAJA", "BANCO"] as const)).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={r.medio === m}
                  onClick={() => cambiarRenglon(r.clave, { medio: m })}
                  className={cn(
                    "rounded-[9.6px] px-4 text-sm font-semibold transition-colors",
                    r.medio === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "CAJA" ? "Caja" : m === "BANCO" ? "Banco" : "Anticipo"}
                </button>
              ))}
            </div>
            {renglones.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar el medio ${i + 1}`}
                className="text-muted-foreground hover:text-danger"
                onClick={() => cambiar(ultimo.current.filter((x) => x.clave !== r.clave))}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 @md:grid-cols-[minmax(0,1fr)_200px]">
            <div className="min-w-0">
              {r.medio === "ANTICIPO" ? (
                <select
                  aria-label={`Anticipo del medio ${i + 1}`}
                  value={r.anticipo?.origenId ?? ""}
                  onChange={(e) => {
                    const anticipo = anticipos.find((a) => a.origenId === e.target.value) ?? null;
                    cambiarRenglon(r.clave, {
                      anticipo,
                      valor: anticipo !== null && r.valor.trim() === "" ? String(anticipo.disponible) : r.valor,
                    });
                  }}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm"
                >
                  <option value="">Elegir el anticipo…</option>
                  {anticipos.map((a) => (
                    <option key={a.origenId} value={a.origenId}>
                      {a.etiqueta} · le quedan {formatCOP(a.disponible)}
                    </option>
                  ))}
                </select>
              ) : r.medio === "CAJA" ? (
                cajaFija ? (
                  <CajaPrincipal valor={r.caja} onElegir={(caja) => cambiarRenglon(r.clave, { caja })} />
                ) : (
                  <SelectorCaja valor={r.caja} onElegir={(caja) => cambiarRenglon(r.clave, { caja })} />
                )
              ) : (
                <SelectorCuentaBancaria valor={r.cuenta} onElegir={(cuenta) => cambiarRenglon(r.clave, { cuenta })} />
              )}
            </div>
            {r.medio === "ANTICIPO" ? (
              <CampoPesos
                value={r.valor}
                onChange={(valor) => cambiarRenglon(r.clave, { valor })}
                placeholder="$ 0"
                className="h-11 rounded-xl px-4 text-right font-mono"
                aria-label={`Valor del medio ${i + 1}`}
              />
            ) : (
              <CampoPrecio
                value={r.valor}
                onChange={(valor) => cambiarRenglon(r.clave, { valor })}
                placeholder={estado !== null && estado.resto > 0 ? `el resto: ${formatCOPExacto(estado.resto)}` : "el resto"}
                className="h-11 rounded-xl px-4 text-right font-mono"
                aria-label={`Valor del medio ${i + 1}`}
              />
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-9 w-fit rounded-xl border-dashed px-3 text-sm"
          onClick={() => cambiar([...ultimo.current, renglonRepartoVacio()])}
        >
          <Plus className="size-3.5" />
          Agregar medio
        </Button>
        {estado !== null && (estado.falta > 0 || estado.sobra > 0) && (
          <p className={cn("text-sm font-medium", estado.sobra > 0 ? "text-danger" : "text-muted-foreground")}>
            {estado.sobra > 0
              ? `Se pasó por ${formatCOPExacto(estado.sobra)}`
              : `Falta repartir ${formatCOPExacto(estado.falta)}`}
          </p>
        )}
      </div>
    </div>
  );
}
