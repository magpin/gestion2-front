import { api } from "@/core/api/api";
import type {
  Documento,
  ResultadoAnalisis,
  ResultadoConfirmacion,
  TipoDocumento,
  UrlDeCarga,
} from "../types/asistente.types";

/**
 * Los siete endpoints del asistente, y nada más.
 *
 * `/configuracion/ia` es el módulo `lectura-documentos` del backend. Lee un
 * documento y **propone** hechos; aplicar es otra llamada, y la hace una persona.
 */
export const asistenteService = {
  // `disponible` no está acá: lo pide `configuracion/hooks/useModoIa`, porque
  // quien primero necesita saberlo es la pantalla que ofrece entrar al modo IA,
  // no la que ya está adentro.

  /** El último intento de cada tipo de documento. */
  documentos: () =>
    api.get<Documento[]>("/configuracion/ia/documentos").then((r) => r.data),

  /** La URL firmada. La llave la decide el servidor, no el navegador. */
  urlDeCarga: (tipo: TipoDocumento | undefined, tipoMime: string) =>
    api
      .post<UrlDeCarga>("/configuracion/ia/documentos/carga", {
        tipo,
        tipoMime,
      })
      .then((r) => r.data),

  /**
   * El archivo sube **directo al bucket**, sin pasar por la API.
   *
   * Va con `fetch` y no con el cliente de axios a propósito: ese cliente le
   * pega el token de sesión a cada petición, y mandarle nuestro token a un
   * servicio de almacenamiento —que además ya viene autorizado en la firma de la
   * URL— sería regalarlo sin necesidad.
   */
  subirAlBucket: async (url: string, archivo: File, tipoMime: string) => {
    // El mismo tipo con el que se firmó: si no coincide, el bucket lo rechaza.
    const respuesta = await fetch(url, {
      method: "PUT",
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
  /** Sin `tipo`, el servidor mira el archivo y reconoce qué documento es. */
  registrar: (tipo: TipoDocumento | undefined, clave: string) =>
    api
      .post<Documento>("/configuracion/ia/documentos", { tipo, clave })
      .then((r) => r.data),

  /**
   * Un archivo subido sin decir qué es: el servidor lo mira y contesta qué es.
   * Si es RUT, Cámara o Resolución, la lectura ya arrancó y viene el documento.
   */
  analizar: (clave: string) =>
    api
      .post<ResultadoAnalisis>("/configuracion/ia/documentos/analizar", { clave })
      .then((r) => r.data),

  /** Corta una lectura en curso. */
  detener: (id: string) =>
    api
      .post<{ detenida: boolean }>(`/configuracion/ia/documentos/${id}/detener`)
      .then((r) => r.data),

  /**
   * Aplica lo aprobado. **No manda valores**: manda los campos, y el valor sale
   * de lo que el backend guardó al leer el documento.
   */
  confirmar: (id: string, campos?: string[]) =>
    api
      .post<ResultadoConfirmacion>(
        `/configuracion/ia/documentos/${id}/confirmar`,
        campos === undefined ? {} : { campos },
      )
      .then((r) => r.data),
};
