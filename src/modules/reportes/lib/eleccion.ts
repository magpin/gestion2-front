import type {
  AtajoCorte,
  AtajoRango,
  ClaveReporte,
  Eleccion,
  Parametro,
} from "../types/reportes.types";

/** Con qué se corre cada reporte: un rango de fechas o una fecha de corte. */
const PARAMETRO: Record<ClaveReporte, Parametro> = {
  VENTAS_POR_CLIENTE: "RANGO",
  ANTIGUEDAD_CARTERA: "CORTE",
  RETENCIONES_350: "RANGO",
  RETEICA: "RANGO",
  CERTIFICADOS_RETENCION: "RANGO",
};
const REPORTES = Object.keys(PARAMETRO) as ClaveReporte[];
const ATAJOS_RANGO: readonly AtajoRango[] = ["ESTE_MES", "MES_PASADO", "ESTE_ANIO", "PERIODO"];
const ATAJOS_CORTE: readonly AtajoCorte[] = ["HOY", "CIERRE_MES_PASADO", "CIERRE_PERIODO_ANTERIOR"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Con qué se corre un reporte si nadie eligió nada: este mes, o hoy. */
export const eleccionPorDefecto = (parametro: Parametro): Eleccion =>
  parametro === "RANGO"
    ? { tipo: "ATAJO_RANGO", atajo: "ESTE_MES" }
    : { tipo: "ATAJO_CORTE", atajo: "HOY" };

/**
 * La dirección del visor. **La elección viaja en la URL**: recargar, volver
 * atrás o mandarle el enlace a alguien abre la misma hoja —y si es un atajo,
 * con las fechas del día en que se abra—.
 */
export function rutaDelVisor(reporte: ClaveReporte, eleccion: Eleccion): string {
  const q = new URLSearchParams({ reporte });
  switch (eleccion.tipo) {
    case "ATAJO_RANGO":
    case "ATAJO_CORTE":
      q.set("atajo", eleccion.atajo);
      break;
    case "RANGO":
      q.set("desde", eleccion.desde);
      q.set("hasta", eleccion.hasta);
      break;
    case "CORTE":
      q.set("corte", eleccion.corte);
      break;
  }
  return `/dashboard/reportes/ver?${q.toString()}`;
}

/** Lo contrario: la URL del visor, leída. `null` si no se entiende. */
export function leerVisor(
  q: URLSearchParams,
): { reporte: ClaveReporte; eleccion: Eleccion } | null {
  const reporte = q.get("reporte") as ClaveReporte | null;
  if (reporte === null || !REPORTES.includes(reporte)) return null;
  const atajo = q.get("atajo");
  const desde = q.get("desde");
  const hasta = q.get("hasta");
  const corte = q.get("corte");

  if (PARAMETRO[reporte] === "RANGO") {
    if (atajo && ATAJOS_RANGO.includes(atajo as AtajoRango)) {
      return { reporte, eleccion: { tipo: "ATAJO_RANGO", atajo: atajo as AtajoRango } };
    }
    if (desde && hasta && ISO.test(desde) && ISO.test(hasta)) {
      return { reporte, eleccion: { tipo: "RANGO", desde, hasta } };
    }
    return { reporte, eleccion: eleccionPorDefecto("RANGO") };
  }
  if (atajo && ATAJOS_CORTE.includes(atajo as AtajoCorte)) {
    return { reporte, eleccion: { tipo: "ATAJO_CORTE", atajo: atajo as AtajoCorte } };
  }
  if (corte && ISO.test(corte)) {
    return { reporte, eleccion: { tipo: "CORTE", corte } };
  }
  return { reporte, eleccion: eleccionPorDefecto("CORTE") };
}

/** La llave de caché de una elección. */
export const llaveDe = (e: Eleccion): string =>
  e.tipo === "RANGO"
    ? `${e.desde}_${e.hasta}`
    : e.tipo === "CORTE"
      ? e.corte
      : e.atajo;
