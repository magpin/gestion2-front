"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { CajaPrincipal } from "./CajaPrincipal";
import { RepartoEnTarjetas } from "./RepartoEnTarjetas";
import { SelectorCaja } from "./SelectorCaja";
import { SelectorCuentaBancaria } from "./SelectorCuentaBancaria";
import {
  type FormaPagoBorrador,
  type ModoPago,
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
  cajaFija = false,
  conVence = false,
  total,
}: {
  /** El total que se reparte, si se sabe: para «Falta repartir» y «el resto». */
  total?: number | null;
  valor: FormaPagoBorrador;
  onCambiar: (valor: FormaPagoBorrador) => void;
  soloCredito?: boolean;
  motivoSoloCredito?: string;
  /**
   * La caja no se elige: es la principal de la empresa (`CajaPrincipal`).
   * Ventas lo usa —el efectivo de una venta entra siempre ahí—; compras no,
   * porque pagar con la caja menor sí tiene sentido.
   */
  cajaFija?: boolean;
  /**
   * A crédito, pedir cuándo vence. Sin fecha, la cartera y «Por pagar»
   * cuentan 30 días desde el documento.
   */
  conVence?: boolean;
}) {
  const cambiar = (cambio: Partial<FormaPagoBorrador>) =>
    onCambiar({ ...valor, ...cambio });

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
          className="flex w-full flex-wrap gap-1 rounded-xl border border-border bg-muted p-1"
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
                  "min-w-24 flex-1 rounded-[9.6px] px-4 py-2 text-sm font-semibold transition-colors",
                  valor.modo === modo
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  deshabilitado && "cursor-not-allowed opacity-50",
                )}
              >
                {etiqueta}
              </button>
            );
          })}
        </div>

        {valor.modo === "EFECTIVO" &&
          (cajaFija ? (
            <CajaPrincipal
              valor={valor.caja}
              onElegir={(caja) => cambiar({ caja })}
            />
          ) : (
            <SelectorCaja
              valor={valor.caja}
              onElegir={(caja) => cambiar({ caja })}
            />
          ))}

        {valor.modo === "CREDITO" && conVence && (
          <label className="flex w-fit flex-col gap-1.5 text-sm">
            <span className="font-medium">
              Vence <span className="font-normal text-muted-foreground">(opcional)</span>
            </span>
            <Input
              type="date"
              value={valor.vence}
              onChange={(e) => cambiar({ vence: e.target.value })}
              className="h-11 w-52 rounded-xl px-4"
            />
            <span className="text-xs text-muted-foreground">
              Sin fecha, la cartera cuenta 30 días desde la emisión.
            </span>
          </label>
        )}

        {valor.modo === "TRANSFERENCIA" && (
          <SelectorCuentaBancaria
            valor={valor.cuenta}
            onElegir={(cuenta) => cambiar({ cuenta })}
          />
        )}

        {valor.modo === "REPARTIDO" && (
          <RepartoEnTarjetas
            renglones={valor.renglones}
            onCambiar={(renglones) => cambiar({ renglones })}
            total={total}
            cajaFija={cajaFija}
          />
        )}
      </div>
    </Campo>
  );
}
