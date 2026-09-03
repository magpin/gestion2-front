import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type {
  Abono,
  ArqueoCaja,
  Cartera,
  DocumentoEnCartera,
  FiltrosAbono,
  FiltrosArqueo,
  FiltrosMovimiento,
  MovimientoCaja,
  NuevoArqueoPayload,
  NuevoCobroPayload,
  NuevoPagoPayload,
} from "../types/caja.types";

/** Los `numeric` de Postgres llegan como string: se normalizan al entrar. */
function normalizarAbono(abono: Abono): Abono {
  return { ...abono, importe: Number(abono.importe) };
}

function normalizarMovimiento(movimiento: MovimientoCaja): MovimientoCaja {
  return { ...movimiento, importe: Number(movimiento.importe) };
}

function normalizarArqueo(arqueo: ArqueoCaja): ArqueoCaja {
  return {
    ...arqueo,
    saldoSistema: Number(arqueo.saldoSistema),
    saldoContado: Number(arqueo.saldoContado),
    diferencia: Number(arqueo.diferencia),
  };
}

function normalizarDocumento(documento: DocumentoEnCartera): DocumentoEnCartera {
  return {
    ...documento,
    total: Number(documento.total),
    saldoPendiente: Number(documento.saldoPendiente),
  };
}

export const cajaService = {
  /**
   * El efectivo que debería haber en el cajón hasta esa fecha, inclusive.
   *
   * Es una suma de `movimiento_caja`, no un contador guardado: el día que un
   * contador se desincronizara, nadie sabría cuál de los dos tiene razón.
   */
  saldo: (fecha: string) =>
    api
      .get<{ fecha: string; saldo: number }>("/caja/saldo", { params: { fecha } })
      .then((r) => Number(r.data.saldo)),

  movimientos: (filtros: FiltrosMovimiento) =>
    api
      .get<Paginado<MovimientoCaja>>("/caja/movimientos", { params: filtros })
      .then((r) => ({ ...r.data, datos: r.data.datos.map(normalizarMovimiento) })),

  /** Los dos lados en una sola respuesta: cada uno lo contesta su módulo dueño. */
  cartera: () =>
    api.get<Cartera>("/cartera").then((r) => ({
      ...r.data,
      porCobrar: r.data.porCobrar.map(normalizarDocumento),
      porPagar: r.data.porPagar.map(normalizarDocumento),
      totalPorCobrar: Number(r.data.totalPorCobrar),
      totalPorPagar: Number(r.data.totalPorPagar),
    })),

  /** Evento A4. Baja el saldo de la venta, asienta y —si fue efectivo— mueve la caja. */
  cobrar: (data: NuevoCobroPayload) =>
    api.post<Abono>("/cobros", data).then((r) => normalizarAbono(r.data)),

  /** Evento A2. Misma tabla, mismo camino, sentido contrario. */
  pagar: (data: NuevoPagoPayload) =>
    api.post<Abono>("/pagos", data).then((r) => normalizarAbono(r.data)),

  abonos: (filtros: FiltrosAbono) =>
    api
      .get<Paginado<Abono>>("/abonos", { params: filtros })
      .then((r) => ({ ...r.data, datos: r.data.datos.map(normalizarAbono) })),

  abono: (id: string) =>
    api.get<Abono>(`/abonos/${id}`).then((r) => normalizarAbono(r.data)),

  /**
   * Anular devuelve el saldo, reversa el asiento y —si movió caja— registra el
   * movimiento contrario. No borra: la caja solo agrega.
   */
  anularAbono: (id: string, motivo: string) =>
    api
      .post<Abono>(`/abonos/${id}/anular`, { motivo })
      .then((r) => normalizarAbono(r.data)),

  /** Evento A6. Si cuadra no deja asiento; si no cuadra, exige observación. */
  arquear: (data: NuevoArqueoPayload) =>
    api.post<ArqueoCaja>("/arqueos", data).then((r) => normalizarArqueo(r.data)),

  arqueos: (filtros: FiltrosArqueo) =>
    api
      .get<Paginado<ArqueoCaja>>("/arqueos", { params: filtros })
      .then((r) => ({ ...r.data, datos: r.data.datos.map(normalizarArqueo) })),

  arqueo: (id: string) =>
    api.get<ArqueoCaja>(`/arqueos/${id}`).then((r) => normalizarArqueo(r.data)),
};
