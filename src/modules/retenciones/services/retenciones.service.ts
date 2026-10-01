import { api } from "@/core/api/api";
import type {
  AciertoFuente,
  AjustePropuesto,
  AprendidoConcepto,
  DiferenciaRecalculo,
  PropuestaPerfil,
  ResidenciaFiscal,
  IcaMunicipioEmpresa,
  IcaTercero,
  NuevoIcaTerceroInput,
  ConceptoLey,
  NuevoPerfilInput,
  RetencionCalculadaGuardada,
  VersionPerfil,
  ConceptoRetencionResumen,
  Previsualizacion,
  Uvt,
} from "../types/retenciones.types";

export const retencionesApi = {
  conceptos: (anio?: number) =>
    api
      .get<ConceptoRetencionResumen[]>("/retenciones/conceptos", {
        params: { anio },
      })
      .then((r) => r.data),

  uvt: () => api.get<Uvt[]>("/retenciones/uvt").then((r) => r.data),

  /** Los conceptos de la ley con todas sus vigencias. */
  ley: () => api.get<ConceptoLey[]>("/retenciones/ley").then((r) => r.data),

  /** El mismo cálculo que al guardar, para verlo antes. */
  previsualizar: (params: {
    conceptoId: string;
    base: number;
    fecha: string;
    declaranteRenta: boolean;
    tipoPersona?: "NATURAL" | "JURIDICA";
    lado?: "RETENEMOS" | "NOS_RETIENEN";
  }) =>
    api
      .get<Previsualizacion>("/retenciones/previsualizar", { params })
      .then((r) => r.data),

  /** Por qué se retuvo lo que se retuvo en un documento. */
  deDocumento: (tipo: "COMPRA" | "NOTA_CREDITO_COMPRA", id: string) =>
    api
      .get<RetencionCalculadaGuardada[]>(
        `/retenciones/documentos/${tipo}/${id}`,
      )
      .then((r) => r.data),

  /** Los datos tributarios de un tercero, con su historia. */
  perfil: (terceroId: string) =>
    api
      .get<VersionPerfil[]>(`/retenciones/terceros/${terceroId}/perfil`)
      .then((r) => r.data),

  nuevoPerfil: (terceroId: string, datos: NuevoPerfilInput) =>
    api
      .post<VersionPerfil[]>(`/retenciones/terceros/${terceroId}/perfil`, datos)
      .then((r) => r.data),

  /** El ICA de la empresa en cada municipio con sede. */
  ica: () =>
    api.get<IcaMunicipioEmpresa[]>("/retenciones/ica").then((r) => r.data),

  /** El ICA de un proveedor por municipio, con su historia. */
  icaTercero: (terceroId: string) =>
    api
      .get<IcaTercero[]>(`/retenciones/terceros/${terceroId}/ica`)
      .then((r) => r.data),

  nuevoIcaTercero: (terceroId: string, datos: NuevoIcaTerceroInput) =>
    api
      .post<IcaTercero[]>(`/retenciones/terceros/${terceroId}/ica`, datos)
      .then((r) => r.data),

  /** Lo que el motor aprendió de lo que confirmaron. */
  aciertos: () =>
    api.get<AciertoFuente[]>("/retenciones/aciertos").then((r) => r.data),

  aprendido: () =>
    api.get<AprendidoConcepto[]>("/retenciones/aprendido").then((r) => r.data),

  quitarAprendido: (id: string) =>
    api.post(`/retenciones/aprendido/${id}/quitar`).then(() => undefined),

  /** Lo que dejó un recálculo por cambio de norma: las pendientes primero. */
  diferencias: () =>
    api
      .get<DiferenciaRecalculo[]>("/retenciones/diferencias")
      .then((r) => r.data),

  /** El asiento que corregiría la diferencia, sin registrar nada. */
  verAjuste: (id: string) =>
    api
      .get<AjustePropuesto>(`/retenciones/diferencias/${id}/ajuste`)
      .then((r) => r.data),

  registrarAjuste: (id: string) =>
    api
      .post<{ asiento: string }>(`/retenciones/diferencias/${id}/ajuste`)
      .then((r) => r.data),

  descartarDiferencia: (id: string, motivo: string) =>
    api
      .post(`/retenciones/diferencias/${id}/descartar`, { motivo })
      .then(() => undefined),

  /** La residencia fiscal de un proveedor del exterior (§8.15). */
  residencia: (terceroId: string) =>
    api
      .get<ResidenciaFiscal>(`/retenciones/terceros/${terceroId}/residencia`)
      .then((r) => r.data),

  nuevaResidencia: (
    terceroId: string,
    datos: {
      paisCodigo: string;
      certificadoDesde: string;
      certificadoHasta: string;
      observacion?: string;
    },
  ) =>
    api
      .post<ResidenciaFiscal>(
        `/retenciones/terceros/${terceroId}/residencia`,
        datos,
      )
      .then((r) => r.data),

  /** Cambios al perfil de proveedores que proponen sus facturas (§8.8). */
  propuestasPerfil: (terceroId?: string) =>
    api
      .get<PropuestaPerfil[]>("/retenciones/propuestas-perfil", {
        params: terceroId ? { terceroId } : {},
      })
      .then((r) => r.data),

  aprobarPropuestaPerfil: (id: string) =>
    api
      .post(`/retenciones/propuestas-perfil/${id}/aprobar`)
      .then(() => undefined),

  rechazarPropuestaPerfil: (id: string, motivo: string) =>
    api
      .post(`/retenciones/propuestas-perfil/${id}/rechazar`, { motivo })
      .then(() => undefined),
};
