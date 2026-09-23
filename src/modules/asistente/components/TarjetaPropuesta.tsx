"use client";

import { Check, ChevronDown, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { cn, formatCOP, formatFecha } from "@/lib/utils";
import type { CuerpoDePago, PropuestaConversacion } from "../types/conversacion.types";
import { LIMITES } from "../lib/limites";
import { Maria } from "./Maria";
import { BotonTarjeta } from "./Piezas";

const TITULO = { COBRO: "Cobro propuesto", PAGO: "Pago propuesto" } as const;
const DESHACER = {
  COBRO: "Si hubo un error, se deshace con «Devolver cobro» en el menú de la factura.",
  PAGO: "Si hubo un error, se deshace con «Devolver pago» en el menú de la compra.",
} as const;
const ESTADO = {
  PENDIENTE: "Sin registrar",
  CONFIRMADA: "Registrado",
  DESCARTADA: "Descartado",
  VENCIDA: "Vencido",
} as const;

/**
 * Un cobro o un pago que el asistente armó (paso 7 de
 * `docs/planes/asistente-acciones.md`). **Nada está registrado hasta que la
 * persona aprieta Confirmar.**
 *
 * Muestra lo que salió de la verificación en seco: la factura o la compra, el
 * saldo antes y después, de qué caja o cuenta, y el asiento que se va a hacer,
 * plegado. La fecha y —si hay un solo medio— el valor se pueden corregir antes
 * de confirmar; lo corregido es lo que se registra.
 *
 * No hay «confirmar todas»: cada cobro se mira.
 */
export function TarjetaPropuesta({
  propuesta,
  confirmando,
  descartando,
  alConfirmar,
  alDescartar,
  sinPermiso,
}: {
  propuesta: PropuestaConversacion;
  confirmando: boolean;
  descartando: boolean;
  alConfirmar: (correccion?: CuerpoDePago) => void;
  alDescartar: () => void;
  /**
   * Si al confirmar el servidor contestó que el rol no alcanza: su mensaje,
   * que dice qué rol hace falta. No se guarda en la propuesta —no es de ella,
   * es de quien la confirma—, así que llega desde afuera.
   */
  sinPermiso?: string | null;
}) {
  const { accion, cuerpo, vistaPrevia, estado, error } = propuesta;
  const pendiente = estado === "PENDIENTE";
  const unSoloMedio = cuerpo.pagos.length === 1;
  const [fecha, setFecha] = useState(cuerpo.fecha);
  const [valor, setValor] = useState(String(cuerpo.pagos[0]?.valor ?? ""));
  const [verAsiento, setVerAsiento] = useState(false);

  const valorNumero = Number(valor.replace(",", "."));
  const corregido =
    fecha !== cuerpo.fecha || (unSoloMedio && valorNumero !== cuerpo.pagos[0].valor);
  const valido = fecha !== "" && (!unSoloMedio || (Number.isFinite(valorNumero) && valorNumero > 0));
  const registrado = propuesta.cuerpoConfirmado ?? cuerpo;

  const confirmar = () => {
    if (!corregido) return alConfirmar();
    alConfirmar({
      fecha,
      pagos: unSoloMedio ? [{ ...cuerpo.pagos[0], valor: valorNumero }] : cuerpo.pagos,
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-4 py-3.5",
        pendiente ? "border-input bg-card" : "border-muted bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">
          {TITULO[accion]}
        </span>
        {/* El estado va en el fondo y el borde; el texto, neutro. Es la regla
            de identidad: el color dice en qué quedó, la palabra lo explica. */}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            estado === "CONFIRMADA"
              ? "border-success/40 bg-success/10 text-foreground"
              : pendiente
                ? "border-warning/40 bg-warning/10 text-foreground"
                : "border-transparent bg-muted text-muted-foreground",
          )}
        >
          {estado === "CONFIRMADA" && <Check className="size-3" aria-hidden="true" />}
          {ESTADO[estado]}
        </span>
      </div>

      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
        <dt className="text-muted-foreground">{accion === "COBRO" ? "Factura" : "Compra"}</dt>
        <dd className="m-0">
          <span className="font-medium">{vistaPrevia.documento.numero}</span> ·{" "}
          {vistaPrevia.documento.tercero}
        </dd>

        <dt className="text-muted-foreground">Saldo</dt>
        <dd className="m-0 tabular-nums">
          {formatCOP(Number(vistaPrevia.documento.pendienteAntes))} →{" "}
          {formatCOP(Number(vistaPrevia.documento.pendienteDespues))}
        </dd>

        <dt className="text-muted-foreground">{accion === "COBRO" ? "Entra por" : "Sale de"}</dt>
        <dd className="m-0">
          {vistaPrevia.medios.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <span>{m.nombre}</span>
              {pendiente && unSoloMedio ? (
                <input
                  aria-label="Valor"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="h-7 w-32 rounded-md border border-input bg-card px-2 text-right tabular-nums"
                />
              ) : (
                <span className="tabular-nums">
                  {formatCOP(estado === "CONFIRMADA" ? registrado.pagos[i]?.valor : m.valor)}
                </span>
              )}
            </div>
          ))}
        </dd>

        <dt className="text-muted-foreground">Fecha</dt>
        <dd className="m-0">
          {pendiente ? (
            <input
              aria-label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-7 rounded-md border border-input bg-card px-2"
            />
          ) : (
            formatFecha(registrado.fecha)
          )}
        </dd>
      </dl>

      {vistaPrevia.asientos.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={verAsiento}
            onClick={() => setVerAsiento((v) => !v)}
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", verAsiento && "rotate-180")}
              aria-hidden="true"
            />
            {verAsiento ? "Ocultar el asiento" : "Ver el asiento que se hace"}
          </button>
          {verAsiento &&
            vistaPrevia.asientos.map((a, i) => (
              <table key={i} className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="py-1 text-left font-medium">Cuenta</th>
                    <th className="py-1 text-right font-medium">Débito</th>
                    <th className="py-1 text-right font-medium">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {a.lineas.map((l, j) => (
                    <tr key={j} className="border-t border-muted">
                      <td className="py-1">
                        <span className="font-mono">{l.cuenta}</span> {l.nombre}
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {Number(l.debito) === 0 ? "" : formatCOP(Number(l.debito))}
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {Number(l.credito) === 0 ? "" : formatCOP(Number(l.credito))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          {verAsiento && pendiente && corregido && (
            <span className="text-xs text-muted-foreground">
              Es el asiento de lo propuesto; con tu corrección cambian los valores.
            </span>
          )}
        </div>
      )}

      {pendiente && (sinPermiso != null || error !== null) && (
        <NoSePudo error={error} sinPermiso={sinPermiso ?? null} />
      )}

      {pendiente ? (
        <div className="flex flex-wrap items-center gap-2">
          <BotonTarjeta principal onClick={confirmar} disabled={!valido || confirmando || descartando}>
            {confirmando ? "Registrando…" : corregido ? "Confirmar con los cambios" : "Confirmar"}
          </BotonTarjeta>
          <BotonTarjeta onClick={alDescartar} disabled={confirmando || descartando}>
            Descartar
          </BotonTarjeta>
        </div>
      ) : estado === "CONFIRMADA" ? (
        <span className="text-xs text-muted-foreground">
          {DESHACER[accion]}
        </span>
      ) : estado === "VENCIDA" ? (
        <span className="text-xs text-muted-foreground">
          Pasaron más de 24 horas. Si todavía hace falta, pedile al asistente que la arme de nuevo.
        </span>
      ) : null}
    </div>
  );
}

/**
 * Por qué no se registró, con la cara que le corresponde.
 *
 * Dos casos tienen cara propia (`lib/limites.ts`): **el período cerrado** —la
 * fecha cae en un mes que ya no recibe asientos— y **el rol que no alcanza**.
 * Ninguno es rojo, porque no son errores de quien mira, y los dos dicen qué
 * sigue. Cualquier otro rechazo —la caja se cerró, alguien cobró mientras
 * tanto— se dice tal cual, sin cara.
 *
 * El período cerrado se reconoce por el mensaje, y acá sí se puede: no es texto
 * del modelo sino de nuestro servidor, el mismo en compras, ventas y tesorería.
 */
function NoSePudo({
  error,
  sinPermiso,
}: {
  error: string | null;
  sinPermiso: string | null;
}) {
  const periodoCerrado = error !== null && /per[ií]odo[^.]*cerrado/i.test(error);
  const limite =
    sinPermiso !== null
      ? LIMITES.sinPermiso
      : periodoCerrado
        ? LIMITES.periodoCerrado
        : null;

  if (limite === null) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[13px]"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-muted bg-muted/40 px-3 py-2.5 text-[13px]"
    >
      <Maria estado={limite.cara} tamano={28} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{limite.titulo}</span>
        <span className="text-muted-foreground">{sinPermiso ?? error}</span>
        <span className="text-muted-foreground">
          {periodoCerrado && sinPermiso === null
            ? "Cambiá la fecha a un período abierto y confirmá de nuevo, o descartala."
            : limite.salida}
        </span>
      </div>
    </div>
  );
}
