import { api } from "@/core/api/api";
import type { ResumenLibro } from "../types/tesoreria.types";
import type {
  ActualizarReglaExtractoInput,
  AgregarLineaExtractoInput,
  CargaInicialBancoInput,
  CerrarCorteBancoInput,
  CompletarGrupoInput,
  ConciliarInput,
  CorteBancoResumen,
  CrearCuentaBancariaInput,
  CrearExtractoInput,
  CrearReglaExtractoInput,
  CuentaBancariaResumen,
  ExtractoDetalle,
  ExtractoResumen,
  ImportarExtractoInput,
  LineaExtractoResumen,
  MovimientoBancoResumen,
  PaginaCortesBanco,
  PaginaExtractos,
  PaginaMovimientosBanco,
  PrevioCorteBanco,
  PropuestasExtracto,
  RegistrarDesdeExtractoInput,
  ReglaExtractoResumen,
  RegistrarMovimientoBancoInput,
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

  /**
   * La cuenta bancaria con su auxiliar «Bancos - {banco} ···{últimos 4}» bajo
   * 111005, de una vez: nadie tiene que ir antes al plan de cuentas.
   */
  crearConAuxiliar: (datos: Omit<CrearCuentaBancariaInput, "cuentaId">) =>
    api.post<CuentaBancariaResumen>("/cuentas-bancarias/con-auxiliar", datos).then((r) => r.data),

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

  /**
   * Lo que queda por conciliar: sin cruce y sin el saldo inicial. Es lo que
   * necesita la conciliación, y no la última página del libro: un cheque
   * viejo sin cobrar quedaba fuera de los 50 más recientes.
   */
  porConciliar: (cuentaBancariaId: string) =>
    api
      .get<PaginaMovimientosBanco>(`/cuentas-bancarias/${cuentaBancariaId}/movimientos`, {
        params: { sinConciliar: "true", tamano: 200 },
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

  /**
   * El extracto leído de un archivo: cabecera, líneas y mapeo en una sola
   * transacción. El backend rechaza fechas fuera del rango, un extracto que no
   * cuadra consigo mismo y un archivo que ya se subió.
   */
  importar: (cuentaBancariaId: string, datos: ImportarExtractoInput) =>
    api
      .post<ExtractoResumen>(`/cuentas-bancarias/${cuentaBancariaId}/extractos/importar`, datos)
      .then((r) => r.data),

  porId: (id: string) => api.get<ExtractoDetalle>(`/extractos/${id}`).then((r) => r.data),

  agregarLinea: (id: string, datos: AgregarLineaExtractoInput) =>
    api
      .post<LineaExtractoResumen>(`/extractos/${id}/lineas`, datos)
      .then((r) => r.data),

  /**
   * Qué cruza con qué, calculado en el momento. **No escribe nada**: el
   * sistema propone y una persona confirma.
   */
  propuestas: (id: string) =>
    api
      .get<PropuestasExtracto>(`/extractos/${id}/propuestas`)
      .then((r) => r.data),

  /** Confirma uno o varios cruces que cuadran al centavo. Todos o ninguno. */
  conciliar: (id: string, datos: ConciliarInput) =>
    api.post(`/extractos/${id}/conciliar`, datos).then(() => undefined),

  /** Deshace un cruce. Sin esto, apareado mal es apareado para siempre. */
  deshacer: (id: string, grupoId: string) =>
    api
      .post(`/extractos/${id}/grupos/${grupoId}/deshacer`)
      .then(() => undefined),

  /**
   * Registra en el libro lo que el banco hizo solo —4×1000, comisiones,
   * intereses—: una nota por línea, con la fecha y el valor del banco, cada
   * una cruzada con su línea.
   */
  registrar: (id: string, datos: RegistrarDesdeExtractoInput) =>
    api
      .post<{ registradas: number }>(`/extractos/${id}/registrar`, datos)
      .then((r) => r.data),

  /**
   * Un cruce que no cuadra: registra la nota por la diferencia —cargo o abono
   * del banco, o la corrección de un error nuestro— y cruza todo junto.
   */
  completar: (id: string, datos: CompletarGrupoInput) =>
    api
      .post<{ movimientoId: string; diferencia: number }>(`/extractos/${id}/completar`, datos)
      .then((r) => r.data),

  /**
   * Error del banco: la línea queda sin cruzar, con el porqué, y se le
   * reclama. El libro no se toca. `null` quita la nota.
   */
  anotarLinea: (id: string, lineaId: string, nota: string | null) =>
    api
      .post(`/extractos/${id}/lineas/${lineaId}/nota`, { nota })
      .then(() => undefined),

  /** Exige que toda línea esté explicada y que cuadren las dos cuentas; rechaza con el detalle si no. */
  cerrar: (id: string) =>
    api.post<ExtractoResumen>(`/extractos/${id}/cerrar`).then((r) => r.data),
};

/**
 * El corte diario: el día congelado al cerrar. No se edita ni se rehace; lo
 * que cambie después lo avisa `cambios_posteriores`.
 */
export const cortesBancoApi = {
  listar: (cuentaBancariaId: string, pagina = 1) =>
    api
      .get<PaginaCortesBanco>(`/cuentas-bancarias/${cuentaBancariaId}/cortes`, {
        params: { pagina, tamano: 30 },
      })
      .then((r) => r.data),

  previo: (cuentaBancariaId: string, fecha: string) =>
    api
      .get<PrevioCorteBanco>(`/cuentas-bancarias/${cuentaBancariaId}/cortes/previo`, {
        params: { fecha },
      })
      .then((r) => r.data),

  cerrar: (cuentaBancariaId: string, datos: CerrarCorteBancoInput) =>
    api
      .post<CorteBancoResumen>(`/cuentas-bancarias/${cuentaBancariaId}/cortes`, datos)
      .then((r) => r.data),
};

/**
 * Las reglas que reconocen en el extracto el 4×1000, las comisiones y la cuota
 * de manejo. Reconocen; registrar lo confirma una persona. No se borran: se
 * desactivan.
 */
export const reglasExtractoApi = {
  listar: () =>
    api.get<ReglaExtractoResumen[]>("/extracto-reglas").then((r) => r.data),

  crear: (datos: CrearReglaExtractoInput) =>
    api.post<ReglaExtractoResumen>("/extracto-reglas", datos).then((r) => r.data),

  actualizar: (id: string, datos: ActualizarReglaExtractoInput) =>
    api
      .patch<ReglaExtractoResumen>(`/extracto-reglas/${id}`, datos)
      .then((r) => r.data),
};
