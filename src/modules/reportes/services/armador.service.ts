import { api } from "@/core/api/api";
import type {
  ClaveOrigen,
  Definicion,
  Guardado,
  OrigenArmador,
  Resultado,
} from "../types/armador.types";

/** Los endpoints del armador y de los reportes guardados. */
export const armadorService = {
  origenes: () =>
    api.get<OrigenArmador[]>("/reportes/armador/origenes").then((r) => r.data),

  /** Los valores de una columna de lista, sacados de los datos de la empresa. */
  valores: (origen: ClaveOrigen, columna: string) =>
    api
      .get<string[]>("/reportes/armador/valores", { params: { origen, columna } })
      .then((r) => r.data),

  /** La vista previa: las primeras filas. No cuenta como corrida. */
  muestra: (definicion: Definicion, signal?: AbortSignal) =>
    api
      .post<Resultado>("/reportes/armador/muestra", { definicion }, { signal })
      .then((r) => r.data),

  correr: (definicion: Definicion, guardadoId?: string, signal?: AbortSignal) =>
    api
      .post<Resultado>("/reportes/armador/correr", { definicion, guardadoId }, { signal })
      .then((r) => r.data),

  /** El Excel, bajado con el nombre que decide el servidor. */
  excel: async (definicion: Definicion, nombre?: string, guardadoId?: string) => {
    const r = await api.post<Blob>(
      "/reportes/armador/excel",
      { definicion, nombre, guardadoId },
      { responseType: "blob" },
    );
    const disp = r.headers["content-disposition"] as string | undefined;
    const archivo = disp?.match(/filename="?([^";]+)"?/i)?.[1] ?? "reporte.xlsx";
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  guardados: () => api.get<Guardado[]>("/reportes/guardados").then((r) => r.data),
  guardado: (id: string) => api.get<Guardado>(`/reportes/guardados/${id}`).then((r) => r.data),
  guardar: (nombre: string, definicion: Definicion) =>
    api.post<{ id: string }>("/reportes/guardados", { nombre, definicion }).then((r) => r.data),
  actualizar: (id: string, cambios: { nombre?: string; definicion?: Definicion }) =>
    api.patch(`/reportes/guardados/${id}`, cambios).then(() => undefined),
  /** «Borrar» es archivar: no se borra nada. */
  archivar: (id: string) =>
    api.post(`/reportes/guardados/${id}/archivar`).then(() => undefined),
};
