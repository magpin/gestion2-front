import { api } from "@/core/api/api";
import type {
  Concepto,
  CrearConceptoInput,
  EditarConceptoInput,
  ResultadoPrepararConceptos,
  TipoConcepto,
} from "../types/conceptos.types";

export const conceptosApi = {
  listar: (filtro: { tipo?: TipoConcepto; incluirInactivos?: boolean } = {}) =>
    api
      .get<Concepto[]>("/conceptos", {
        params: {
          tipo: filtro.tipo,
          incluirInactivos: filtro.incluirInactivos ? "true" : undefined,
        },
      })
      .then((r) => r.data),

  /** Siembra el catálogo inicial y les busca cuenta a los que no tienen. Idempotente. */
  preparar: () =>
    api.post<ResultadoPrepararConceptos>("/conceptos/preparar").then((r) => r.data),

  crear: (datos: CrearConceptoInput) =>
    api.post<Concepto>("/conceptos", datos).then((r) => r.data),

  editar: (id: string, datos: EditarConceptoInput) =>
    api.patch<Concepto>(`/conceptos/${id}`, datos).then((r) => r.data),
};
