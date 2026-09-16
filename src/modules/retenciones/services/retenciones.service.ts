import { api } from "@/core/api/api";
import type {
  ConceptoRetencionResumen,
  CrearConceptoInput,
  Uvt,
} from "../types/retenciones.types";

export const retencionesApi = {
  conceptos: (anio?: number) =>
    api
      .get<ConceptoRetencionResumen[]>("/retenciones/conceptos", {
        params: { anio },
      })
      .then((r) => r.data),

  crearConcepto: (datos: CrearConceptoInput) =>
    api
      .post<ConceptoRetencionResumen>("/retenciones/conceptos", datos)
      .then((r) => r.data),

  editarConcepto: (
    id: string,
    datos: {
      nombre?: string;
      tarifa?: number;
      tarifaNoDeclarante?: number;
      baseMinimaUvt?: number;
      activo?: boolean;
    },
  ) =>
    api
      .patch<ConceptoRetencionResumen>(`/retenciones/conceptos/${id}`, datos)
      .then((r) => r.data),

  uvt: () => api.get<Uvt[]>("/retenciones/uvt").then((r) => r.data),

  /** Cargar la del año, o corregirla si se cargó mal. */
  cargarUvt: (anio: number, valor: number) =>
    api.post<Uvt>("/retenciones/uvt", { anio, valor }).then((r) => r.data),
};
