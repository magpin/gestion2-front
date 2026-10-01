import { api } from "@/core/api/api";
import type { ResumenGastos, Sugerencia } from "../types/gastos.types";

export const gastosApi = {
  resumen: (mes: string) => api.get<ResumenGastos>("/gastos", { params: { mes } }).then((r) => r.data),

  /** Qué concepto sugiere María. Sin modelo: historial del tercero y pistas del catálogo. */
  sugerir: (descripcion: string, terceroId?: string) =>
    api
      .get<Sugerencia>("/gastos/sugerir-concepto", { params: { descripcion, terceroId } })
      .then((r) => r.data),
};
