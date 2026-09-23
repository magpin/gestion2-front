import { api } from "@/core/api/api";
import type {
  AsientoDetalle,
  AsientoDiario,
  AsientoNuevo,
  BalancePrueba,
  ComprobanteTipo,
  FiltroAsientos,
  Hallazgo,
  Mayor,
  MovimientoAuxiliar,
  PaginaAsientos,
  Periodo,
  Trazabilidad,
} from "../types/contabilidad.types";

/**
 * El calendario contable.
 *
 * Cerrar un mes es una promesa: los estados financieros que salieron de ahí no
 * cambian. Reabrir la deshace, y por eso solo lo puede el director.
 */
export const periodosApi = {
  listar: (anio?: number) =>
    api
      .get<Periodo[]>("/periodos", { params: anio ? { anio } : undefined })
      .then((r) => r.data),

  /** El período de hoy, o `null` si nadie lo abrió. */
  actual: () => api.get<Periodo | null>("/periodos/actual").then((r) => r.data),

  abrir: (anio: number, mes: number) =>
    api.post<Periodo>("/periodos", { anio, mes }).then((r) => r.data),

  cerrar: (id: string) =>
    api.post(`/periodos/${id}/cerrar`).then(() => undefined),

  reabrir: (id: string) =>
    api.post(`/periodos/${id}/reabrir`).then(() => undefined),
};

/** Las series de numeración: CD-000145, CI-000032. Una por tipo. */
export const comprobantesApi = {
  listar: (incluirInactivos = false) =>
    api
      .get<ComprobanteTipo[]>("/comprobantes", {
        params: incluirInactivos ? { incluirInactivos: "true" } : undefined,
      })
      .then((r) => r.data),

  crear: (datos: {
    codigo: string;
    nombre: string;
    naturaleza: string;
    prefijo: string;
  }) => api.post<ComprobanteTipo>("/comprobantes", datos).then((r) => r.data),

  /** Solo el nombre: el prefijo y la naturaleza ya numeraron asientos. */
  editar: (id: string, datos: { nombre: string }) =>
    api.patch<ComprobanteTipo>(`/comprobantes/${id}`, datos).then((r) => r.data),

  desactivar: (id: string) =>
    api.post(`/comprobantes/${id}/desactivar`).then(() => undefined),

  activar: (id: string) =>
    api.post(`/comprobantes/${id}/activar`).then(() => undefined),
};

/**
 * Los asientos.
 *
 * No hay `editar`, y no es un olvido: un asiento registrado no se edita. El
 * backend lo rechaza con un trigger, y ofrecer el método acá sería prometer algo
 * que la base niega. La corrección es anular y volver a hacerlo, o un
 * contra-asiento si el período ya cerró.
 */
export const asientosApi = {
  listar: (f: FiltroAsientos = {}) =>
    api
      .get<PaginaAsientos>("/asientos", {
        params: {
          q: f.q || undefined,
          desde: f.desde || undefined,
          hasta: f.hasta || undefined,
          comprobanteTipoId: f.comprobanteTipoId || undefined,
          // Solo viaja cuando está encendido: mandar `false` no significa nada
          // distinto de omitirlo, y ensucia la clave de caché.
          incluirAnulados: f.incluirAnulados ? "true" : undefined,
          pagina: f.pagina ?? 1,
          tamano: 50,
        },
      })
      .then((r) => r.data),

  porId: (id: string) =>
    api.get<AsientoDetalle>(`/asientos/${id}`).then((r) => r.data),

  /** De dónde salió: el documento, lo que hizo María y quién aprobó. */
  trazabilidad: (id: string) =>
    api.get<Trazabilidad>(`/asientos/${id}/trazabilidad`).then((r) => r.data),

  crear: (datos: AsientoNuevo) =>
    api
      .post<{ id: string; numero: string }>("/asientos", datos)
      .then((r) => r.data),

  /** No borra: marca ANULADO y guarda quién, cuándo y por qué. */
  anular: (id: string, motivo: string) =>
    api.post(`/asientos/${id}/anular`, { motivo }).then(() => undefined),
};

/**
 * Los tres libros. No son tablas: son consultas sobre las líneas de los
 * asientos. Todos excluyen los anulados.
 */
export const librosApi = {
  diario: (desde: string, hasta: string) =>
    api
      .get<AsientoDiario[]>("/libros/diario", { params: { desde, hasta } })
      .then((r) => r.data),

  mayor: (cuentaId: string, desde: string, hasta: string) =>
    api
      .get<Mayor>("/libros/mayor", { params: { cuentaId, desde, hasta } })
      .then((r) => r.data),

  auxiliarTercero: (terceroId: string, desde: string, hasta: string) =>
    api
      .get<MovimientoAuxiliar[]>("/libros/auxiliar-tercero", {
        params: { terceroId, desde, hasta },
      })
      .then((r) => r.data),

  balancePrueba: (periodoId: string) =>
    api
      .get<BalancePrueba>(`/libros/balance-prueba/${periodoId}`)
      .then((r) => r.data),
};

/**
 * Lo que no cuadra y lo que está dos veces. Solo lee: lo que encuentra lo
 * corrige una persona, por las pantallas de siempre.
 */
export const revisionApi = {
  revisar: () => api.get<Hallazgo[]>("/revision").then((r) => r.data),
};
