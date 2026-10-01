import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import type { TramoPago } from "../types/pagos.types";

const MS_DIA = 86_400_000;
const dia = (s: string) => Date.parse(`${s}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Los cortes de los tramos vistos desde `hoy`: la misma regla que `pagos.reglas.ts` del servidor. */
function cortes(hoy: string) {
  const h = dia(hoy);
  const diaSemana = (new Date(h).getUTCDay() + 6) % 7; // lunes = 0
  const finSemana = h + (6 - diaSemana) * MS_DIA;
  const finProxima = finSemana + 7 * MS_DIA;
  const d = new Date(h);
  const finMes = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
  const p = new Date(finProxima);
  const finTramo =
    finMes > finProxima
      ? finMes
      : Date.UTC(p.getUTCFullYear(), p.getUTCMonth() + 1, 0);
  return { finSemana, finProxima, finTramo };
}

/**
 * En qué tramo cae lo que vence. Los impuestos no pasan por el servidor de
 * pagos: se ubican acá con la misma regla, para que caigan en los mismos
 * tramos que las compras.
 */
export function tramoDe(vence: string, hoy: string): TramoPago {
  if (vence < hoy) return "VENCIDO";
  const { finSemana, finProxima, finTramo } = cortes(hoy);
  const v = dia(vence);
  if (v <= finSemana) return "ESTA_SEMANA";
  if (v <= finProxima) return "PROXIMA_SEMANA";
  if (v <= finTramo) return "RESTO_MES";
  return "DESPUES";
}

const corto = (ms: number, patron: string) =>
  format(parseISO(iso(ms)), patron, { locale: es }).replace(".", "");

/** «Hasta el dom 18 oct», «19 al 25 oct», «Noviembre en adelante». */
export function rangoDeTramo(tramo: TramoPago, hoy: string): string {
  const { finSemana, finProxima, finTramo } = cortes(hoy);
  const rango = (desde: number, hasta: number) =>
    new Date(desde).getUTCMonth() === new Date(hasta).getUTCMonth()
      ? `${corto(desde, "d")} al ${corto(hasta, "d MMM")}`
      : `${corto(desde, "d MMM")} al ${corto(hasta, "d MMM")}`;
  switch (tramo) {
    case "VENCIDO":
      return "Ya pasó la fecha";
    case "ESTA_SEMANA":
      return `Hasta el ${corto(finSemana, "EEE d MMM")}`;
    case "PROXIMA_SEMANA":
      return rango(finSemana + MS_DIA, finProxima);
    case "RESTO_MES":
      return finTramo > finProxima
        ? rango(finProxima + MS_DIA, finTramo)
        : "Nada más este mes";
    case "DESPUES": {
      const t = corto(finTramo + MS_DIA, "MMMM");
      return `${t.charAt(0).toUpperCase()}${t.slice(1)} en adelante`;
    }
  }
}

/** Días entre `hoy` y `fecha`: negativo si ya pasó. */
export function diasHasta(fecha: string, hoy: string): number {
  return Math.round((dia(fecha) - dia(hoy)) / MS_DIA);
}
