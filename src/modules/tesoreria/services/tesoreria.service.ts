import { api } from "@/core/api/api";
import type {
  AbrirArqueoInput,
  ArqueoResumen,
  CajaConfiguracion,
  CajaResumen,
  CargaInicialCajaInput,
  CerrarArqueoInput,
  ConceptoArqueo,
  CrearCajaInput,
  EditarCajaInput,
  EgresoCajaInput,
  IngresoCajaInput,
  MovimientoCajaResumen,
  PaginaArqueos,
  PaginaMovimientosCaja,
  ResumenLibro,
  ResultadoPreparar,
  ReversarMovimientoCajaInput,
} from "../types/tesoreria.types";

/**
 * El maestro de cajas. Nada se borra: desactivar saca la caja de los
 * selectores de digitación pero conserva su libro.
 */
export const cajasApi = {
  listar: (f: { incluirInactivas?: boolean } = {}) =>
    api
      .get<CajaResumen[]>("/cajas", {
        params: { incluirInactivas: f.incluirInactivas ? "true" : undefined },
      })
      .then((r) => r.data),

  porId: (id: string) => api.get<CajaResumen>(`/cajas/${id}`).then((r) => r.data),

  crear: (datos: CrearCajaInput) => api.post<CajaResumen>("/cajas", datos).then((r) => r.data),

  editar: (id: string, datos: EditarCajaInput) =>
    api.patch<CajaResumen>(`/cajas/${id}`, datos).then((r) => r.data),

  desactivar: (id: string) => api.post(`/cajas/${id}/desactivar`).then(() => undefined),

  activar: (id: string) => api.post(`/cajas/${id}/activar`).then(() => undefined),
};

/**
 * El libro de una caja. Sin `PATCH` ni `DELETE`: un movimiento no se edita
 * ni se borra, se corrige con el contrario — mismo criterio que el kardex.
 */
export const movimientosCajaApi = {
  /** Cuánto entró y cuánto salió en el libro entero, no en la página. */
  resumen: (cajaId: string) =>
    api
      .get<ResumenLibro>(`/cajas/${cajaId}/movimientos/resumen`)
      .then((r) => r.data),

  listar: (cajaId: string, pagina = 1) =>
    api
      .get<PaginaMovimientosCaja>(`/cajas/${cajaId}/movimientos`, {
        params: { pagina, tamano: 50 },
      })
      .then((r) => r.data),

  /** Solo una vez por caja: el saldo con el que arranca. No genera asiento. */
  saldoInicial: (cajaId: string, datos: CargaInicialCajaInput) =>
    api.post(`/cajas/${cajaId}/movimientos/saldo-inicial`, datos).then((r) => r.data),

  ingreso: (cajaId: string, datos: IngresoCajaInput) =>
    api.post(`/cajas/${cajaId}/movimientos/ingreso`, datos).then((r) => r.data),

  egreso: (cajaId: string, datos: EgresoCajaInput) =>
    api.post(`/cajas/${cajaId}/movimientos/egreso`, datos).then((r) => r.data),

  /** Corrige un ingreso o egreso manual con el movimiento contrario. */
  reversar: (cajaId: string, movimientoId: string, datos: ReversarMovimientoCajaInput) =>
    api
      .post<MovimientoCajaResumen>(`/cajas/${cajaId}/movimientos/${movimientoId}/reversar`, datos)
      .then((r) => r.data),
};

/**
 * El cuadre diario. Sin `PATCH` ni `DELETE`: un arqueo cerrado queda
 * congelado, se corrige con un arqueo nuevo, no editando el viejo.
 */
export const arqueosApi = {
  listar: (cajaId: string, pagina = 1) =>
    api
      .get<PaginaArqueos>(`/cajas/${cajaId}/arqueos`, {
        params: { pagina, tamano: 50 },
      })
      .then((r) => r.data),

  abrir: (cajaId: string, datos: AbrirArqueoInput) =>
    api.post<ArqueoResumen>(`/cajas/${cajaId}/arqueos/abrir`, datos).then((r) => r.data),

  cerrar: (cajaId: string, datos: CerrarArqueoInput) =>
    api.post<ArqueoResumen>(`/cajas/${cajaId}/arqueos/cerrar`, datos).then((r) => r.data),
};

/** La cuenta contable contra la que se ajusta un faltante o sobrante de arqueo. */
export const configuracionCajaApi = {
  obtener: () => api.get<CajaConfiguracion>("/tesoreria/configuracion").then((r) => r.data),

  fijar: (concepto: ConceptoArqueo, cuentaId: string) =>
    api
      .put<CajaConfiguracion>(`/tesoreria/configuracion/${concepto}`, { cuentaId })
      .then((r) => r.data),

  /** Crea lo que falte para operar: cuentas de arqueo, cajas por sede y caja menor. */
  preparar: () =>
    api.post<ResultadoPreparar>("/tesoreria/configuracion/preparar").then((r) => r.data),
};

/** Lo que dejó hecho cada paso de `preparar-todo`, y lo que no se pudo. */
export interface ResultadoPrepararTodo {
  pasos: Array<{ paso: string; hecho: string[]; error?: string }>;
}

/**
 * Deja la empresa lista para operar: depreciación corregida, cajas por sede,
 * cuentas de inventario según la actividad, conceptos y patrimonio. Lo corre
 * el asistente al crear el plan. Idempotente.
 */
export const prepararTodoApi = {
  preparar: () =>
    api.post<ResultadoPrepararTodo>("/configuracion/preparar-todo").then((r) => r.data),
};
