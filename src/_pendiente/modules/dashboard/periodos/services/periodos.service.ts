import { api } from "@/core/api/api";
import type { CreatePeriodoPayload, PeriodoContable } from "../types/periodos.types";

export const periodosService = {
  // Reason: el backend devuelve la lista completa (sin paginar) en data.
  obtenerTodos: () =>
    api.get<PeriodoContable[]>("/contabilidad/periodos").then((r) => r.data),

  crear: (data: CreatePeriodoPayload) =>
    api.post<PeriodoContable>("/contabilidad/periodos", data).then((r) => r.data),

  cerrar: (id: string) =>
    api.post<PeriodoContable>(`/contabilidad/periodos/${id}/cerrar`).then((r) => r.data),

  reabrir: (id: string) =>
    api.post<PeriodoContable>(`/contabilidad/periodos/${id}/reabrir`).then((r) => r.data),
};
