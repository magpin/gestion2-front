import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type { Asiento, AsientoDetalle, FiltrosAsiento } from "../types/asientos.types";

/** Los `numeric` de Postgres llegan como string: se normalizan al entrar. */
function normalizarDetalle(detalle: AsientoDetalle): AsientoDetalle {
  return {
    ...detalle,
    debito: Number(detalle.debito),
    credito: Number(detalle.credito),
  };
}

function normalizar(asiento: Asiento): Asiento {
  return {
    ...asiento,
    totalDebito: Number(asiento.totalDebito),
    totalCredito: Number(asiento.totalCredito),
    detalles: asiento.detalles?.map(normalizarDetalle),
  };
}

/**
 * Solo lectura, y no es una omisión.
 *
 * No hay `POST /contabilidad/asientos` ni endpoint para anular: los asientos
 * nacen dentro de la transacción del documento que los produce —una venta, una
 * compra, un arqueo— a través de `ContabilidadApi.asentar()`. Corregir uno es
 * anular su documento, que emite la reversa.
 */
export const asientosService = {
  obtenerTodos: (filtros?: FiltrosAsiento) =>
    api
      .get<Paginado<Asiento>>("/contabilidad/asientos", { params: filtros })
      .then((r) => ({ ...r.data, datos: r.data.datos.map(normalizar) })),

  obtenerPorId: (id: string) =>
    api.get<Asiento>(`/contabilidad/asientos/${id}`).then((r) => normalizar(r.data)),
};
