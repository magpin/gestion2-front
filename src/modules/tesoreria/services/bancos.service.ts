import { api } from "@/core/api/api";
import type { ResumenLibro } from "../types/tesoreria.types";
import type {
  AgregarLineaExtractoInput,
  CargaInicialBancoInput,
  ConciliarManualInput,
  CrearCuentaBancariaInput,
  CrearExtractoInput,
  CuentaBancariaResumen,
  ExtractoDetalle,
  ExtractoResumen,
  LineaExtractoResumen,
  MovimientoBancoResumen,
  PaginaExtractos,
  PaginaMovimientosBanco,
  RegistrarMovimientoBancoInput,
  ResumenConciliacionAutomatica,
} from "../types/bancos.types";

/**
 * El maestro de cuentas bancarias. Nada se borra: desactivar saca la
 * cuenta de los selectores de digitación pero conserva su libro.
 */
export const cuentasBancariasApi = {
  listar: (f: { incluirInactivas?: boolean } = {}) =>
    api
      .get<CuentaBancariaResumen[]>("/cuentas-bancarias", {
        params: { incluirInactivas: f.incluirInactivas ? "true" : undefined },
      })
      .then((r) => r.data),

  porId: (id: string) =>
    api.get<CuentaBancariaResumen>(`/cuentas-bancarias/${id}`).then((r) => r.data),

  crear: (datos: CrearCuentaBancariaInput) =>
    api.post<CuentaBancariaResumen>("/cuentas-bancarias", datos).then((r) => r.data),

  desactivar: (id: string) =>
    api.post(`/cuentas-bancarias/${id}/desactivar`).then(() => undefined),

  activar: (id: string) =>
    api.post(`/cuentas-bancarias/${id}/activar`).then(() => undefined),
};

/**
 * El libro de una cuenta bancaria. Sin `PATCH` ni `DELETE`: un
 * movimiento no se edita ni se borra, se corrige con el contrario.
 */
export const movimientosBancoApi = {
  /** Cuánto entró y cuánto salió en el libro entero, no en la página. */
  resumen: (cuentaBancariaId: string) =>
    api
      .get<ResumenLibro>(
        `/cuentas-bancarias/${cuentaBancariaId}/movimientos/resumen`,
      )
      .then((r) => r.data),

  listar: (cuentaBancariaId: string, pagina = 1) =>
    api
      .get<PaginaMovimientosBanco>(`/cuentas-bancarias/${cuentaBancariaId}/movimientos`, {
        params: { pagina, tamano: 50 },
      })
      .then((r) => r.data),

  /** Solo una vez por cuenta: el saldo con el que arranca. No genera asiento. */
  saldoInicial: (cuentaBancariaId: string, datos: CargaInicialBancoInput) =>
    api
      .post<MovimientoBancoResumen>(
        `/cuentas-bancarias/${cuentaBancariaId}/movimientos/saldo-inicial`,
        datos,
      )
      .then((r) => r.data),

  registrar: (cuentaBancariaId: string, datos: RegistrarMovimientoBancoInput) =>
    api
      .post<MovimientoBancoResumen>(
        `/cuentas-bancarias/${cuentaBancariaId}/movimientos`,
        datos,
      )
      .then((r) => r.data),
};

/**
 * La conciliación bancaria. Un extracto es un rango de fechas, no un
 * día: no encadena con el anterior.
 */
export const extractosApi = {
  listar: (cuentaBancariaId: string, pagina = 1) =>
    api
      .get<PaginaExtractos>(`/cuentas-bancarias/${cuentaBancariaId}/extractos`, {
        params: { pagina, tamano: 50 },
      })
      .then((r) => r.data),

  crear: (cuentaBancariaId: string, datos: CrearExtractoInput) =>
    api
      .post<ExtractoResumen>(`/cuentas-bancarias/${cuentaBancariaId}/extractos`, datos)
      .then((r) => r.data),

  porId: (id: string) => api.get<ExtractoDetalle>(`/extractos/${id}`).then((r) => r.data),

  agregarLinea: (id: string, datos: AgregarLineaExtractoInput) =>
    api
      .post<LineaExtractoResumen>(`/extractos/${id}/lineas`, datos)
      .then((r) => r.data),

  /** Aparea por (fecha, valor) exacto; deja sin tocar el caso ambiguo. */
  conciliarAutomatico: (id: string) =>
    api
      .post<ResumenConciliacionAutomatica>(`/extractos/${id}/conciliar-automatico`)
      .then((r) => r.data),

  /** Aparea a mano lo que el automático dejó sin tocar. */
  conciliarManual: (id: string, datos: ConciliarManualInput) =>
    api.post(`/extractos/${id}/conciliar-manual`, datos).then(() => undefined),

  /** Exige que cuadren las dos cuentas de la conciliación; rechaza con el detalle si no. */
  cerrar: (id: string) =>
    api.post<ExtractoResumen>(`/extractos/${id}/cerrar`).then((r) => r.data),
};
