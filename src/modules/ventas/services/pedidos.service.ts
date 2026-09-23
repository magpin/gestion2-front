import { api } from "@/core/api/api";
import { lecturasApi } from "@/modules/compras/services/lecturas.service";
import type { LecturaPedido } from "../types/pedidos.types";
import type {
  CrearFacturaInput,
  VentaDocumentoDetalle,
} from "../types/ventas.types";

/**
 * Los pedidos de clientes que María leyó.
 *
 * Subir el archivo es la misma plomería que la factura de compra —firmar,
 * subir directo al bucket, encolar—, con otro tipo. Lo propio vive en
 * `/pedidos-leidos`, fuera de `/facturas` porque `GET facturas/:id` se
 * tragaría la ruta.
 */
export const pedidosApi = {
  listar: () => api.get<LecturaPedido[]>("/pedidos-leidos").then((r) => r.data),

  urlDeCarga: (tipoMime: string) =>
    api
      .post<{ url: string; clave: string }>(
        "/configuracion/ia/documentos/carga",
        { tipo: "PEDIDO_VENTA", tipoMime },
      )
      .then((r) => r.data),

  subirAlBucket: lecturasApi.subirAlBucket,

  encolar: (clave: string) =>
    api
      .post<LecturaPedido>("/configuracion/ia/documentos", {
        tipo: "PEDIDO_VENTA",
        clave,
      })
      .then((r) => r.data),

  /**
   * Emite la factura. Lo mismo que `POST /facturas` —el precio lo pone la
   * lista, no esto—; lo único que agrega es que el servidor deja dicho de qué
   * pedido salió.
   */
  facturar: (id: string, datos: CrearFacturaInput) =>
    api
      .post<VentaDocumentoDetalle>(`/pedidos-leidos/${id}/facturar`, datos)
      .then((r) => r.data),
};
