import { api } from "@/core/api/api";
import type {
  CrearMovimientoConceptoInput,
  Direccion,
  MovimientoConcepto,
  OrigenMovimiento,
} from "../types/movimientos-concepto.types";

export const movimientosConceptoApi = {
  listar: (filtro: { direccion?: Direccion; origen?: OrigenMovimiento } = {}) =>
    api
      .get<MovimientoConcepto[]>("/movimientos-concepto", { params: filtro })
      .then((r) => r.data),

  crear: (datos: CrearMovimientoConceptoInput) =>
    api.post<MovimientoConcepto>("/movimientos-concepto", datos).then((r) => r.data),

  anular: (id: string, motivo: string) =>
    api
      .post<MovimientoConcepto>(`/movimientos-concepto/${id}/anular`, { motivo })
      .then((r) => r.data),

  /** Cuánto 4×1000 cobraría el banco por esta salida. */
  gmfPrevisto: (cuentaBancariaId: string, valor: number) =>
    api
      .get<number>("/tesoreria/gmf-previsto", { params: { cuentaBancariaId, valor } })
      .then((r) => r.data),
};
