import { api } from "@/core/api/api";
import type { PropuestaRenta } from "@/modules/retenciones/types/retenciones.types";
import type { CompraDocumentoDetalle } from "../types/compras.types";
import type {
  LecturaFactura,
  RegistrarLecturaInput,
  UrlDeCargaLectura,
} from "../types/lecturas.types";

/**
 * Las facturas que María leyó.
 *
 * Subir el archivo va por `/configuracion/ia/documentos*`, que es la plomería
 * compartida —firmar, subir al bucket, encolar— y es la misma para los cuatro
 * documentos que el sistema sabe leer. Lo propio de las facturas vive en
 * `/facturas-leidas`.
 *
 * El nombre de esa ruta no es `compras/lecturas`, que era lo natural: el
 * backend ya tiene `GET compras/:id` y se tragaba la ruta tomando «lecturas»
 * por un id.
 */
export const lecturasApi = {
  /** Las últimas leídas, las más nuevas primero. */
  listar: () =>
    api.get<LecturaFactura[]>("/facturas-leidas").then((r) => r.data),

  /** Una, con sus renglones, sus comprobaciones y lo que quedó por preguntar. */
  ver: (id: string) =>
    api.get<LecturaFactura>(`/facturas-leidas/${id}`).then((r) => r.data),

  /** La URL firmada. La llave la decide el servidor, no el navegador. */
  urlDeCarga: (tipoMime: string) =>
    api
      .post<UrlDeCargaLectura>("/configuracion/ia/documentos/carga", {
        tipo: "FACTURA_COMPRA",
        tipoMime,
      })
      .then((r) => r.data),

  /**
   * El archivo sube **directo al bucket**, sin pasar por la API.
   *
   * Con `fetch` y no con el cliente de axios, por lo mismo que en el asistente:
   * ese cliente le pega el token de sesión a cada petición, y mandárselo a un
   * servicio de almacenamiento —que ya viene autorizado en la firma— sería
   * regalarlo sin necesidad.
   */
  subirAlBucket: async (url: string, archivo: File, tipoMime: string) => {
    const respuesta = await fetch(url, {
      method: "PUT",
      // El mismo tipo con el que se firmó: si no coincide, el bucket rechaza.
      headers: { "Content-Type": tipoMime },
      body: archivo,
    });
    if (!respuesta.ok) {
      throw new Error(
        `El archivo no se pudo subir (${respuesta.status}). Revisá que el almacenamiento esté disponible.`,
      );
    }
  },

  /** Registra el archivo ya subido y lo encola. Contesta sin esperar la lectura. */
  encolar: (clave: string) =>
    api
      .post<LecturaFactura>("/configuracion/ia/documentos", {
        tipo: "FACTURA_COMPRA",
        clave,
      })
      .then((r) => r.data),

  /** Corta una lectura en curso. */
  detener: (id: string) =>
    api
      .post<{ detenida: boolean }>(`/configuracion/ia/documentos/${id}/detener`)
      .then((r) => r.data),

  /**
   * Registra la compra. **No manda montos**: la cantidad, el costo y la tarifa
   * salen de lo que el backend guardó al leer. De acá va solo lo que la persona
   * decidió — a qué apunta cada renglón, quién es el proveedor, qué número.
   */
  /** La retención de renta que llevaría, con la impresa al lado. Nada se guarda. */
  simularRetencion: (id: string, datos: RegistrarLecturaInput) =>
    api
      .post<PropuestaRenta>(`/facturas-leidas/${id}/simular-retencion`, datos)
      .then((r) => r.data),

  registrar: (id: string, datos: RegistrarLecturaInput) =>
    api
      .post<CompraDocumentoDetalle>(`/facturas-leidas/${id}/registrar`, datos)
      .then((r) => r.data),
};
