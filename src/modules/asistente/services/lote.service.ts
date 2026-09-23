import { api } from "@/core/api/api";

import type { Lote } from "../types/lote.types";

export const lotesApi = {
  /** Los archivos ya subidos al bucket, en el orden en que se soltaron. */
  crear: (archivos: Array<{ clave: string; nombre: string }>) =>
    api.post<Lote>("/lotes", { archivos }).then((r) => r.data),

  /** Los últimos de quien pregunta. */
  listar: () => api.get<Lote[]>("/lotes").then((r) => r.data),

  detener: (id: string) => api.post<Lote>(`/lotes/${id}/detener`).then((r) => r.data),

  /** Deja una lectura sin registrar, con el motivo. */
  descartar: (tipo: string, documentoId: string, motivo: string) =>
    api
      .post(
        `/${tipo === "PEDIDO_VENTA" ? "pedidos-leidos" : "facturas-leidas"}/${documentoId}/descartar`,
        { motivo },
      )
      .then((r) => r.data),
};
