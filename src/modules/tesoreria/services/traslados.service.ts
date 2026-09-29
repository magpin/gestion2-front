import { api } from "@/core/api/api";
import type { CrearTrasladoInput, MedioTraslado, Traslado } from "../types/traslados.types";

export const trasladosApi = {
  listar: () => api.get<Traslado[]>("/traslados").then((r) => r.data),

  crear: (datos: CrearTrasladoInput) => api.post<Traslado>("/traslados", datos).then((r) => r.data),

  anular: (id: string, motivo: string) =>
    api.post<Traslado>(`/traslados/${id}/anular`, { motivo }).then((r) => r.data),

  /** Si el traslado causa 4×1000 y cuánto, antes de guardar. */
  gmfPrevisto: (p: {
    origenMedio: MedioTraslado;
    origenId: string;
    destinoMedio: MedioTraslado;
    destinoId: string;
    valor: number;
  }) =>
    api
      .get<{ causa: boolean; gmf: number }>("/traslados/gmf-previsto", { params: p })
      .then((r) => r.data),
};
