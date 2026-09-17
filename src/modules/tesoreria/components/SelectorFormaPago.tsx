"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorCaja } from "./SelectorCaja";
import { SelectorCuentaBancaria } from "./SelectorCuentaBancaria";
import {
  renglonRepartoVacio,
  type FormaPagoBorrador,
  type ModoPago,
  type RenglonReparto,
} from "../lib/formaPago";

const MODOS: { modo: ModoPago; etiqueta: string }[] = [
  { modo: "CREDITO", etiqueta: "Crédito" },
  { modo: "EFECTIVO", etiqueta: "Efectivo" },
  { modo: "TRANSFERENCIA", etiqueta: "Transferencia" },
  { modo: "REPARTIDO", etiqueta: "Repartido" },
];

/**
 * Cómo se paga el documento que se está emitiendo: crédito, o de contado por
 * uno o varios medios. Ninguna opción viene marcada —crédito es una elección,
 * no lo que queda cuando nadie preguntó—.
 *
 * No pide el valor en efectivo ni en transferencia: el total exacto lo
 * calcula el servidor (IVA, retenciones), y el medio único se lleva todo. En
 * el repartido se digitan los valores y uno queda en blanco para el resto.
 *
 * `soloCredito` es para quien puede emitir pero no manejar la plata: ve las
 * opciones, y le queda claro por qué no puede elegir las de contado.
 */
export function SelectorFormaPago({
  valor,
  onCambiar,
  soloCredito = false,
  motivoSoloCredito,
}: {
  valor: FormaPagoBorrador;
  onCambiar: (valor: FormaPagoBorrador) => void;
  soloCredito?: boolean;
  motivoSoloCredito?: string;
}) {
  const cambiar = (cambio: Partial<FormaPagoBorrador>) =>
    onCambiar({ ...valor, ...cambio });

  const cambiarRenglon = (clave: number, cambio: Partial<RenglonReparto>) =>
    cambiar({
      renglones: valor.renglones.map((r) =>
        r.clave === clave ? { ...r, ...cambio } : r,
      ),
    });

  return (
    <Campo
      id="formaPago"
      etiqueta="¿Cómo se paga?"
      escala="grande"
      ayuda={
        soloCredito
          ? motivoSoloCredito
          : valor.modo === "REPARTIDO"
            ? "Digitá lo que va por cada medio y dejá uno en blanco: ese se lleva lo que falte."
            : valor.modo === "EFECTIVO" || valor.modo === "TRANSFERENCIA"
              ? "Se registra por el total del documento en el mismo momento."
              : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div
          id="formaPago"
          role="radiogroup"
          className="inline-flex w-fit flex-wrap gap-1 rounded-2xl border border-border bg-muted p-1"
        >
          {MODOS.map(({ modo, etiqueta }) => {
            const deshabilitado = soloCredito && modo !== "CREDITO";
            return (
              <button
                key={modo}
                type="button"
                role="radio"
                aria-checked={valor.modo === modo}
                disabled={deshabilitado}
                onClick={() => cambiar({ modo })}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                  valor.modo === modo
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                  deshabilitado && "cursor-not-allowed opacity-50",
                )}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>

        {valor.modo === "EFECTIVO" && (
          <SelectorCaja
            valor={valor.caja}
            onElegir={(caja) => cambiar({ caja })}
          />
        )}

        {valor.modo === "TRANSFERENCIA" && (
          <SelectorCuentaBancaria
            valor={valor.cuenta}
            onElegir={(cuenta) => cambiar({ cuenta })}
          />
        )}

        {valor.modo === "REPARTIDO" && (
          <div className="flex flex-col gap-3">
            {valor.renglones.map((r, i) => (
              <div
                key={r.clave}
                className="grid items-center gap-3 rounded-2xl border border-border p-3 sm:grid-cols-[auto_1fr_180px_auto]"
              >
                <div className="inline-flex w-fit gap-1 rounded-xl border border-border bg-muted p-1">
                  {(["CAJA", "BANCO"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => cambiarRenglon(r.clave, { medio: m })}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                        r.medio === m
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {m === "CAJA" ? "Caja" : "Banco"}
                    </button>
                  ))}
                </div>

                {r.medio === "CAJA" ? (
                  <SelectorCaja
                    valor={r.caja}
                    onElegir={(caja) => cambiarRenglon(r.clave, { caja })}
                  />
                ) : (
                  <SelectorCuentaBancaria
                    valor={r.cuenta}
                    onElegir={(cuenta) => cambiarRenglon(r.clave, { cuenta })}
                  />
                )}

                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={r.valor}
                  onChange={(e) =>
                    cambiarRenglon(r.clave, { valor: e.target.value })
                  }
                  placeholder="el resto"
                  className="h-11 rounded-xl px-4 text-right font-mono"
                  aria-label={`Valor del medio ${i + 1}`}
                />

                {valor.renglones.length > 2 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar el medio ${i + 1}`}
                    className="text-muted-foreground hover:text-danger"
                    onClick={() =>
                      cambiar({
                        renglones: valor.renglones.filter(
                          (x) => x.clave !== r.clave,
                        ),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : (
                  <span className="hidden sm:block sm:w-9" />
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              className="h-11 w-fit rounded-xl px-4 text-brand-text"
              onClick={() =>
                cambiar({
                  renglones: [...valor.renglones, renglonRepartoVacio()],
                })
              }
            >
              <Plus className="size-4" />
              Agregar medio
            </Button>
          </div>
        )}
      </div>
    </Campo>
  );
}
