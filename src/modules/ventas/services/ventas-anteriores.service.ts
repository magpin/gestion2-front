import { api } from "@/core/api/api";
import { lecturasApi } from "@/modules/compras/services/lecturas.service";
import type {
  LecturaVentasAnteriores,
  ResultadoCargaAnteriores,
} from "../types/ventas-anteriores.types";

/**
 * Las facturas de venta del sistema anterior que María leyó. Subir el archivo
 * es la misma plomería que un pedido —firmar, subir al bucket, encolar—, con
 * otro tipo; lo propio vive en `/ventas-historicas-leidas`.
 */
export const ventasAnterioresApi = {
  listar: () =>
    api
      .get<LecturaVentasAnteriores[]>("/ventas-historicas-leidas")
      .then((r) => r.data),

  urlDeCarga: (tipoMime: string) =>
    api
      .post<{ url: string; clave: string }>(
        "/configuracion/ia/documentos/carga",
        { tipo: "VENTA_HISTORICA", tipoMime },
      )
      .then((r) => r.data),

  subirAlBucket: lecturasApi.subirAlBucket,

  encolar: (clave: string) =>
    api
      .post<LecturaVentasAnteriores>("/configuracion/ia/documentos", {
        tipo: "VENTA_HISTORICA",
        clave,
      })
      .then((r) => r.data),

  /** Todas o ninguna: si una tiene un problema, no entra ninguna. */
  cargar: (id: string, facturas: Array<{ numero: string; pagada: boolean }>) =>
    api
      .post<ResultadoCargaAnteriores>(
        `/ventas-historicas-leidas/${id}/cargar`,
        { facturas },
      )
      .then((r) => r.data),
};
