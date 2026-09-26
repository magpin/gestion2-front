"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CampoPesos } from "@/components/shared/CampoNumero";
import { cn, formatCOP } from "@/lib/utils";
import { CajaPrincipal } from "./CajaPrincipal";
import { SelectorCaja } from "./SelectorCaja";
import { SelectorCuentaBancaria } from "./SelectorCuentaBancaria";
import type { CajaResumen, MedioPagoInput } from "../types/tesoreria.types";
import type { CuentaBancariaResumen } from "../types/bancos.types";

export type Medio = "CAJA" | "BANCO";

/** Un renglón mientras se edita. El valor es texto: vacío es "sin llenar", no cero. */
export interface RenglonPagoBorrador {
  /** Clave de React. No viaja al servidor. */
  clave: number;
  medio: Medio;
  caja: CajaResumen | null;
  cuenta: CuentaBancariaResumen | null;
  valor: string;
}

export function renglonPagoVacio(valor = ""): RenglonPagoBorrador {
  return {
    clave: Date.now() + Math.random(),
    medio: "CAJA",
    caja: null,
    cuenta: null,
    valor,
  };
}

/** Lo que suman los renglones, en centavos enteros: `0.1 + 0.2` no da `0.3`. */
export function sumaDe(renglones: readonly RenglonPagoBorrador[]): number {
  const centavos = renglones.reduce(
    (t, r) => t + Math.round(Number(r.valor || 0) * 100),
    0,
  );
  return centavos / 100;
}

/**
 * Qué impide mandar este reparto, o `null` si no hay nada. Se devuelve el
 * primer problema y no todos: el pie del formulario muestra uno a la vez.
 */
export function problemaDe(
  renglones: readonly RenglonPagoBorrador[],
  tope: number,
  verbo: "cobrar" | "pagar" | "devolver",
): string | null {
  for (const r of renglones) {
    if (r.medio === "CAJA" && r.caja === null)
      return `Elegí la caja de cada renglón.`;
    if (r.medio === "BANCO" && r.cuenta === null)
      return `Elegí la cuenta de cada renglón.`;
    if (!(Number(r.valor) > 0))
      return `Cada renglón necesita un valor mayor a cero.`;
  }
  const suma = sumaDe(renglones);
  if (suma > tope)
    return verbo === "devolver"
      ? `Estás devolviendo ${formatCOP(suma - tope)} de más: no se puede devolver más de lo que entró.`
      : `Estás repartiendo ${formatCOP(suma - tope)} de más: no se puede ${verbo} más de lo que falta.`;
  return null;
}

/** Los renglones llenos, en la forma que espera la API. */
export function aPagos(
  renglones: readonly RenglonPagoBorrador[],
): MedioPagoInput[] {
  return renglones.map((r) =>
    r.medio === "CAJA"
      ? { medio: "CAJA" as const, cajaId: r.caja!.id, valor: Number(r.valor) }
      : {
          medio: "BANCO" as const,
          cuentaBancariaId: r.cuenta!.id,
          valor: Number(r.valor),
        },
  );
}

/**
 * De dónde sale o entra la plata, en uno o varios renglones.
 *
 * Hasta el paso 12 esto era un medio y un valor, y el cliente que pagaba la
 * mitad en efectivo y la mitad por transferencia obligaba a cobrar dos veces.
 * Con un solo renglón se ve y se usa igual que antes; el segundo aparece solo
 * si alguien lo pide.
 *
 * Vive en `tesoreria` y no en `ventas` porque el cobro y el pago lo arman
 * igual: la diferencia entre cobrar y pagar está en el documento, no en el
 * medio.
 */
export function EditorMediosPago({
  renglones,
  onCambiar,
  tope,
  soloExceso = false,
  cajaFija = false,
}: {
  renglones: RenglonPagoBorrador[];
  onCambiar: (renglones: RenglonPagoBorrador[]) => void;
  /** Cuánto falta en total: lo que queda por repartir se mide contra esto. */
  tope: number;
  /**
   * Avisar solo si se pasa del tope, no cuánto falta. Al devolver, el tope es
   * lo cobrado y no hay que devolverlo todo: «falta repartir» sería falso.
   */
  soloExceso?: boolean;
  /**
   * La caja no se elige: es la principal de la empresa (`CajaPrincipal`).
   * Ventas lo usa —el efectivo de una venta entra siempre ahí—; compras no,
   * porque pagar con la caja menor sí tiene sentido.
   */
  cajaFija?: boolean;
}) {
  const actualizar = (clave: number, cambio: Partial<RenglonPagoBorrador>) =>
    onCambiar(
      renglones.map((r) => (r.clave === clave ? { ...r, ...cambio } : r)),
    );

  const falta = tope - sumaDe(renglones);

  return (
    <div className="flex flex-col gap-4">
      {renglones.map((r, i) => (
        <div
          key={r.clave}
          className="flex flex-col gap-4 rounded-2xl border border-border p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex w-fit gap-1 rounded-2xl border border-border bg-muted p-1">
              {(["CAJA", "BANCO"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => actualizar(r.clave, { medio: m })}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                    r.medio === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {m === "CAJA" ? "Caja" : "Banco"}
                </button>
              ))}
            </div>

            {/* Con un solo renglón no se ofrece quitarlo: es el mínimo. */}
            {renglones.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar el renglón ${i + 1}`}
                className="text-muted-foreground hover:text-danger"
                onClick={() =>
                  onCambiar(renglones.filter((x) => x.clave !== r.clave))
                }
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            {r.medio === "CAJA" ? (
              cajaFija ? (
                <CajaPrincipal
                  valor={r.caja}
                  onElegir={(caja) => actualizar(r.clave, { caja })}
                />
              ) : (
                <SelectorCaja
                  valor={r.caja}
                  onElegir={(caja) => actualizar(r.clave, { caja })}
                />
              )
            ) : (
              <SelectorCuentaBancaria
                valor={r.cuenta}
                onElegir={(cuenta) => actualizar(r.clave, { cuenta })}
              />
            )}

            <CampoPesos
              value={r.valor}
              onChange={(valor) => actualizar(r.clave, { valor })}
              placeholder="0"
              className="h-11 rounded-xl px-4 text-right font-mono"
              aria-label={`Valor del renglón ${i + 1}`}
            />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-xl px-4 text-brand-text"
          onClick={() => onCambiar([...renglones, renglonPagoVacio()])}
        >
          <Plus className="size-4" />
          Agregar medio
        </Button>

        {/* Cuánto falta repartir: es la pregunta que se hace quien divide un
            pago, y hacerla a mano contra el saldo es donde se equivoca. */}
        {falta !== 0 && !(soloExceso && falta > 0) && (
          <p
            className={cn(
              "text-sm font-medium",
              falta < 0 ? "text-danger" : "text-muted-foreground",
            )}
          >
            {falta > 0
              ? `Falta repartir ${formatCOP(falta)}`
              : `Te pasaste por ${formatCOP(-falta)}`}
          </p>
        )}
      </div>
    </div>
  );
}
