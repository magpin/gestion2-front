import { api } from "@/core/api/api";

import type { Lote } from "../types/lote.types";

/** Dónde vive cada lectura que se puede descartar desde el lote. */
const RUTA_DE: Record<string, string> = {
  PEDIDO_VENTA: "pedidos-leidos",
  VENTA_HISTORICA: "ventas-historicas-leidas",
};

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
        `/${RUTA_DE[tipo] ?? "facturas-leidas"}/${documentoId}/descartar`,
        { motivo },
      )
      .then((r) => r.data),
};
