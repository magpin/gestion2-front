import { api } from "@/core/api/api";
import type { DiaDeCaja, MovimientosTesoreria } from "../types/caja-bancos.types";

/** Caja y bancos (Fase 6): el día de una caja y los movimientos de todas las cuentas juntas. */
export const cajaBancosApi = {
  dia: (cajaId: string) => api.get<DiaDeCaja>(`/cajas/${cajaId}/dia`).then((r) => r.data),

  movimientos: (desde?: string, hasta?: string) =>
    api.get<MovimientosTesoreria>("/tesoreria/movimientos", { params: { desde, hasta } }).then((r) => r.data),
};
