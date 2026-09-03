import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type { FiltrosPuc, PucCuenta } from "../types/puc.types";

export const pucService = {
  buscar: (filtros: FiltrosPuc) =>
    api.get<Paginado<PucCuenta>>("/contabilidad/puc", { params: filtros }).then((r) => r.data),

  // Reason: devuelve la cuenta con `parent` e `hijos` directos → permite el árbol lazy.
  obtenerPorCodigo: (codigo: string) =>
    api.get<PucCuenta>(`/contabilidad/puc/${codigo}`).then((r) => r.data),
};
