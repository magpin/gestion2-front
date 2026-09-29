import { api } from "@/core/api/api";
import type { DiaDeCaja, MovimientosTesoreria } from "../types/caja-bancos.types";
import type { CargarSaldosInicialesInput, EstadoSaldosIniciales } from "../types/saldos-iniciales.types";

/** Caja y bancos (Fase 6): el día de una caja y los movimientos de todas las cuentas juntas. */
export const cajaBancosApi = {
  dia: (cajaId: string) => api.get<DiaDeCaja>(`/cajas/${cajaId}/dia`).then((r) => r.data),

  movimientos: (desde?: string, hasta?: string) =>
    api.get<MovimientosTesoreria>("/tesoreria/movimientos", { params: { desde, hasta } }).then((r) => r.data),

  /** El arranque: qué cajas y cuentas todavía no tienen saldo inicial. */
  saldosIniciales: () => api.get<EstadoSaldosIniciales>("/tesoreria/saldos-iniciales").then((r) => r.data),

  cargarSaldosIniciales: (datos: CargarSaldosInicialesInput) =>
    api
      .post<{ asientoId: string; numero: string; total: number }>("/tesoreria/saldos-iniciales", datos)
      .then((r) => r.data),
};
