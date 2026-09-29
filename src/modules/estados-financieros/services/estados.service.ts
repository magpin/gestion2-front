import { api } from "@/core/api/api";
import type {
  Balance,
  Flujo,
  FormatoEstado,
  Proyectado,
  Resultados,
  TipoEstado,
} from "../types/estados.types";

/** El nombre que manda el servidor en `Content-Disposition`, o uno razonable. */
function nombreDeArchivo(disposicion: string | undefined, porDefecto: string): string {
  const m = disposicion?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return m ? decodeURIComponent(m[1]) : porDefecto;
}

export const estadosApi = {
  resultados: (mes: string, comparar?: string) =>
    api
      .get<Resultados>("/estados-financieros/resultados", { params: { mes, comparar } })
      .then((r) => r.data),

  balance: (mes: string, comparar?: string) =>
    api
      .get<Balance>("/estados-financieros/balance", { params: { mes, comparar } })
      .then((r) => r.data),

  flujo: (mes: string) =>
    api.get<Flujo>("/estados-financieros/flujo", { params: { mes } }).then((r) => r.data),

  proyectado: (semanas = 8) =>
    api
      .get<Proyectado>("/estados-financieros/flujo-proyectado", { params: { semanas } })
      .then((r) => r.data),

  /** El PDF o el Excel, bajado al disco con el nombre que decide el servidor. */
  descargar: async (
    estado: TipoEstado,
    formato: FormatoEstado,
    mes: string,
    comparar?: string,
  ): Promise<void> => {
    const r = await api.get<Blob>("/reportes/estados-financieros", {
      params: { estado, formato, mes, comparar },
      responseType: "blob",
    });
    const nombre = nombreDeArchivo(
      r.headers["content-disposition"] as string | undefined,
      `estado-financiero.${formato === "PDF" ? "pdf" : "xlsx"}`,
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
