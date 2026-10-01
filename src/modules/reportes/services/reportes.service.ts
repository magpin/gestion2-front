import { api } from "@/core/api/api";
import type {
  AreaConReportes,
  Atajos,
  ClaveReporte,
  Eleccion,
  Formato,
  HojaEnPantalla,
} from "../types/reportes.types";

/** La ruta de cada reporte en la API. */
const RUTA: Record<ClaveReporte, string> = {
  VENTAS_POR_CLIENTE: "/reportes/ventas-por-cliente",
  ANTIGUEDAD_CARTERA: "/reportes/antiguedad-cartera",
  RETENCIONES_350: "/reportes/retenciones-350",
  RETEICA: "/reportes/reteica",
  CERTIFICADOS_RETENCION: "/reportes/certificados-retencion",
};

/** La elección, como la entiende el endpoint. */
export function parametrosDe(eleccion: Eleccion): Record<string, string> {
  switch (eleccion.tipo) {
    case "ATAJO_RANGO":
    case "ATAJO_CORTE":
      return { atajo: eleccion.atajo };
    case "RANGO":
      return { desde: eleccion.desde, hasta: eleccion.hasta };
    case "CORTE":
      return { corte: eleccion.corte };
  }
}

/** El nombre que manda el servidor en `Content-Disposition`, o uno razonable. */
function nombreDeArchivo(disposicion: string | undefined, porDefecto: string): string {
  const m = disposicion?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return m ? decodeURIComponent(m[1]) : porDefecto;
}

export const reportesService = {
  /** Los reportes que el rol puede correr, por área, con la última vez de cada uno. */
  listar: () =>
    api.get<{ areas: AreaConReportes[] }>("/reportes").then((r) => r.data.areas),

  /**
   * Las fechas reales que da cada atajo hoy.
   *
   * Las resuelve el servidor —la zona horaria de Colombia y el período
   * contable en curso están allá—, y el modal las muestra antes de correr.
   */
  atajos: () => api.get<Atajos>("/reportes/atajos").then((r) => r.data),

  /**
   * La hoja para mirar en pantalla.
   *
   * Llega como texto y va a un `iframe` con `srcdoc`: un `iframe` con `src` no
   * puede mandar el token. Lo que el servidor sabe de la corrida —las fechas
   * que resolvió, si vino vacía, si falló una gráfica— viaja en cabeceras
   * para no tener que leer el HTML.
   *
   * `previa` es la miniatura de la tarjeta: sale igual, pero no cuenta como
   * «la última vez que se corrió».
   */
  hoja: async (
    reporte: ClaveReporte,
    eleccion: Eleccion,
    opciones: { previa?: boolean; signal?: AbortSignal } = {},
  ): Promise<HojaEnPantalla> => {
    const r = await api.get<string>(RUTA[reporte], {
      params: {
        ...parametrosDe(eleccion),
        formato: "HTML",
        ...(opciones.previa ? { previa: "true" } : {}),
      },
      responseType: "text",
      signal: opciones.signal,
    });
    const h = r.headers;
    return {
      html: r.data,
      desde: String(h["x-reporte-desde"] ?? ""),
      hasta: String(h["x-reporte-hasta"] ?? ""),
      etiqueta: decodeURIComponent(String(h["x-reporte-etiqueta"] ?? "")),
      relativo: h["x-reporte-relativo"] === "true",
      vacio: h["x-reporte-vacio"] === "true",
      graficasFallidas: Number(h["x-reporte-graficas-fallidas"] ?? 0),
    };
  },

  /** El PDF o el Excel, bajado al disco con el nombre que decide el servidor. */
  descargar: async (
    reporte: ClaveReporte,
    eleccion: Eleccion,
    formato: Formato,
    /** Lo que un reporte pide además del rango: el tercero de un certificado. */
    extra: Record<string, string> = {},
  ): Promise<void> => {
    const r = await api.get<Blob>(RUTA[reporte], {
      params: { ...parametrosDe(eleccion), formato, ...extra },
      responseType: "blob",
    });
    const nombre = nombreDeArchivo(
      r.headers["content-disposition"] as string | undefined,
      `reporte.${formato === "PDF" ? "pdf" : "xlsx"}`,
    );
    const url = URL.createObjectURL(r.data);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    // Un momento después: revocarla en el mismo tick cancela la descarga en
    // algunos navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
