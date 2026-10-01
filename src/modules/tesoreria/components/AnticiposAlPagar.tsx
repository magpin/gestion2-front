"use client";

import { CampoPesos } from "@/components/shared/CampoNumero";
import { cn, formatCOP } from "@/lib/utils";
import {
  aplicadoEn,
  cubiertaPorAnticipo,
  type AnticipoDisponible,
  type FormaPagoBorrador,
  type RestoDelAnticipo,
} from "../lib/formaPago";
import { CajaPrincipal } from "./CajaPrincipal";
import { SelectorCaja } from "./SelectorCaja";
import { SelectorCuentaBancaria } from "./SelectorCuentaBancaria";

const RESTOS: { resto: RestoDelAnticipo; etiqueta: string }[] = [
  { resto: "EFECTIVO", etiqueta: "Efectivo" },
  { resto: "TRANSFERENCIA", etiqueta: "Transferencia" },
  { resto: "CREDITO", etiqueta: "A crédito" },
];

/**
 * Pagar con anticipo (Entra a → Anticipo): los anticipos y saldos a favor del
 * cliente, cuánto se aplica de cada uno, y cómo se paga lo que no alcanzan a
 * cubrir. Lo aplicado no mueve caja: la plata entró cuando el cliente la dejó.
 */
export function AnticiposAlPagar({
  valor,
  onCambiar,
  anticipos,
  total,
  cajaFija = false,
  plazo,
}: {
  valor: FormaPagoBorrador;
  onCambiar: (v: FormaPagoBorrador) => void;
  anticipos: AnticipoDisponible[];
  /** Lo que el cliente paga neto, si se sabe: para «falta» y para proponer cuánto aplicar. */
  total?: number | null;
  cajaFija?: boolean;
  /** A crédito, el plazo y el vence que pone quien lo usa. */
  plazo?: React.ReactNode;
}) {
  const cambiar = (cambio: Partial<FormaPagoBorrador>) => onCambiar({ ...valor, ...cambio });
  const aplicadoDe = (origenId: string) => valor.aplicados.find((a) => a.origenId === origenId);
  const aplicado = aplicadoEn(valor);
  const falta = total === null || total === undefined ? null : Math.max(0, Math.round((total - aplicado) * 100) / 100);
  const cubierta = cubiertaPorAnticipo(valor, total);

  const alternar = (a: AnticipoDisponible) => {
    if (aplicadoDe(a.origenId) !== undefined) {
      cambiar({ aplicados: valor.aplicados.filter((x) => x.origenId !== a.origenId) });
      return;
    }
    // Propone lo que le queda, sin pasar de lo que falta por pagar.
    const propuesto = falta === null ? a.disponible : Math.min(a.disponible, falta);
    cambiar({ aplicados: [...valor.aplicados, { ...a, valor: String(propuesto) }] });
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <ul className="flex flex-col gap-3">
        {anticipos.map((a) => {
          const elegido = aplicadoDe(a.origenId);
          return (
            <li key={a.origenId} className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-foreground"
                  checked={elegido !== undefined}
                  onChange={() => alternar(a)}
                />
                <span className="truncate font-medium">{a.etiqueta}</span>
                <span className="text-xs text-muted-foreground">· le quedan {formatCOP(a.disponible)}</span>
              </label>
              {elegido !== undefined && (
                <CampoPesos
                  id={`aplicar-${a.origenId}`}
                  aria-label={`Cuánto se aplica de ${a.etiqueta}`}
                  value={elegido.valor}
                  onChange={(v) =>
                    cambiar({
                      aplicados: valor.aplicados.map((x) => (x.origenId === a.origenId ? { ...x, valor: v } : x)),
                    })
                  }
                  className="h-11 w-44 rounded-xl px-4 text-right font-mono"
                />
              )}
            </li>
          );
        })}
      </ul>

      {aplicado > 0 && cubierta && (
        <p className="text-sm text-muted-foreground">
          El anticipo cubre la factura entera: no entra dinero a caja ni a banco.
        </p>
      )}

      {aplicado > 0 && !cubierta && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <span className="text-xs font-medium text-muted-foreground">
            El resto{falta !== null && <> · <span className="font-mono">{formatCOP(falta)}</span></>}
          </span>
          <div role="radiogroup" aria-label="Cómo se paga el resto" className="flex h-11 w-fit gap-1 rounded-xl border border-border bg-muted p-1">
            {RESTOS.map(({ resto, etiqueta }) => (
              <button
                key={resto}
                type="button"
                role="radio"
                aria-checked={valor.resto === resto}
                onClick={() => cambiar({ resto })}
                className={cn(
                  "rounded-[9.6px] px-4 text-sm font-semibold transition-colors",
                  valor.resto === resto ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {etiqueta}
              </button>
            ))}
          </div>
          <div className="max-w-md">
            {valor.resto === "EFECTIVO" &&
              (cajaFija ? (
                <CajaPrincipal valor={valor.caja} onElegir={(caja) => cambiar({ caja })} />
              ) : (
                <SelectorCaja valor={valor.caja} onElegir={(caja) => cambiar({ caja })} />
              ))}
            {valor.resto === "TRANSFERENCIA" && (
              <SelectorCuentaBancaria valor={valor.cuenta} onElegir={(cuenta) => cambiar({ cuenta })} />
            )}
          </div>
          {valor.resto === "CREDITO" && plazo}
        </div>
      )}
    </div>
  );
}
