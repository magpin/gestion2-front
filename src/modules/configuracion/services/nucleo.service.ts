import { api } from "@/core/api/api";

import type { EstadoConfiguracion } from "../types/configuracion.types";

// Todas las llamadas del núcleo en un archivo.
//
// Son seis grupos pequeños que el asistente usa juntos; repartirlos en seis
// archivos de veinte líneas haría que agregar un paso toque seis sitios.

// ---------------------------------------------------------------------------
// Empresa y sedes
// ---------------------------------------------------------------------------

export interface Empresa {
  id: string;
  razonSocial: string;
  nombreComercial: string | null;
  nit: string;
  dv: string;
  tipoPersona: "JURIDICA" | "NATURAL";
  sectores: string[];
  activo: boolean;
}

export interface Sede {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  municipio_codigo: string;
  municipio_nombre: string | null;
  departamento_nombre: string | null;
  telefono: string | null;
  email: string | null;
  es_principal: boolean;
  activo: boolean;
}

export interface ConfiguracionContable {
  grupo_niif: string;
  moneda_funcional: string;
  mes_cierre_fiscal: number;
  metodo_valoracion_inventario: string;
  fecha_inicio_operaciones: string;
}

export const empresaApi = {
  actual: () => api.get<Empresa>("/empresas/actual").then((r) => r.data),
  editar: (datos: Record<string, unknown>) =>
    api.patch<Empresa>("/empresas/actual", datos).then((r) => r.data),
  crear: (datos: Record<string, unknown>) =>
    api.post<Empresa>("/empresas", datos).then((r) => r.data),

  sedes: () => api.get<Sede[]>("/empresas/actual/sedes").then((r) => r.data),
  crearSede: (datos: Record<string, unknown>) =>
    api.post<Sede>("/empresas/actual/sedes", datos).then((r) => r.data),
  editarSede: (id: string, datos: Record<string, unknown>) =>
    api.patch<Sede>(`/empresas/actual/sedes/${id}`, datos).then((r) => r.data),
  desactivarSede: (id: string) =>
    api.post(`/empresas/actual/sedes/${id}/desactivar`).then(() => undefined),

  configuracionContable: () =>
    api
      .get<ConfiguracionContable>("/empresa-legal/configuracion-contable")
      .then((r) => r.data),
  editarConfiguracionContable: (datos: Record<string, unknown>) =>
    api
      .put<ConfiguracionContable>(
        "/empresa-legal/configuracion-contable",
        datos,
      )
      .then((r) => r.data),

  estadoConfiguracion: () =>
    api
      .get<EstadoConfiguracion>("/empresas/actual/estado-configuracion")
      .then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Situación legal
// ---------------------------------------------------------------------------

/** Las filas históricas llegan tal como salen de la base. */
export interface FilaVigencia {
  id: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  [clave: string]: unknown;
}

export const legalApi = {
  regimenes: () =>
    api
      .get<FilaVigencia[]>("/empresa-legal/regimenes?vigentes=false")
      .then((r) => r.data),
  abrirRegimen: (datos: Record<string, unknown>) =>
    api.post("/empresa-legal/regimenes", datos).then((r) => r.data),
  cerrarRegimen: (id: string, fechaFin: string) =>
    api
      .post(`/empresa-legal/regimenes/${id}/cerrar`, { fechaFin })
      .then(() => undefined),

  /** Casilla 53 del RUT, con vigencia. El catálogo vive en `rutApi`. */
  responsabilidadesRut: () =>
    api
      .get<FilaVigencia[]>(
        "/empresa-legal/responsabilidades-rut?vigentes=false",
      )
      .then((r) => r.data),
  abrirResponsabilidadRut: (datos: Record<string, unknown>) =>
    api.post("/empresa-legal/responsabilidades-rut", datos).then((r) => r.data),
  cerrarResponsabilidadRut: (id: string, fechaFin: string) =>
    api
      .post(`/empresa-legal/responsabilidades-rut/${id}/cerrar`, { fechaFin })
      .then(() => undefined),

  representantes: () =>
    api
      .get<FilaVigencia[]>("/empresa-legal/representantes?vigentes=false")
      .then((r) => r.data),
  abrirRepresentante: (datos: Record<string, unknown>) =>
    api.post("/empresa-legal/representantes", datos).then((r) => r.data),
  cerrarRepresentante: (id: string, fechaFin: string) =>
    api
      .post(`/empresa-legal/representantes/${id}/cerrar`, { fechaFin })
      .then(() => undefined),

  actividades: () =>
    api
      .get<FilaVigencia[]>("/empresa-legal/actividades?vigentes=false")
      .then((r) => r.data),
  abrirActividad: (datos: Record<string, unknown>) =>
    api.post("/empresa-legal/actividades", datos).then((r) => r.data),
  cerrarActividad: (id: string, fechaFin: string) =>
    api
      .post(`/empresa-legal/actividades/${id}/cerrar`, { fechaFin })
      .then(() => undefined),
  /** La tarifa de ICA de una actividad que se registró sin ella. */
  completarTarifaIca: (id: string, tarifaIcaPorMil: number) =>
    api
      .post(`/empresa-legal/actividades/${id}/tarifa-ica`, { tarifaIcaPorMil })
      .then(() => undefined),

  /**
   * Los cuatro hechos que ningún documento declara. Se leen y se guardan
   * enteros: son casillas de una misma pregunta.
   */
  hechosOperativos: () =>
    api.get<string[]>("/empresa-legal/hechos-operativos").then((r) => r.data),
  guardarHechosOperativos: (hechos: string[]) =>
    api
      .put<string[]>("/empresa-legal/hechos-operativos", { hechos })
      .then((r) => r.data),

  matriculas: () =>
    api
      .get<FilaVigencia[]>("/empresa-legal/matriculas?vigentes=false")
      .then((r) => r.data),
  abrirMatricula: (datos: Record<string, unknown>) =>
    api.post("/empresa-legal/matriculas", datos).then((r) => r.data),
  cerrarMatricula: (id: string, fechaFin: string) =>
    api
      .post(`/empresa-legal/matriculas/${id}/cerrar`, { fechaFin })
      .then(() => undefined),
};

// ---------------------------------------------------------------------------
// Resoluciones DIAN
// ---------------------------------------------------------------------------

export interface Resolucion {
  id: string;
  tipo_documento: string;
  numero_resolucion: string;
  prefijo: string | null;
  rango_desde: string;
  rango_hasta: string;
  consecutivo_actual: string;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string;
  ambiente: string;
  activa: boolean;
  tieneClaveTecnica: boolean;
}

export interface EstadoCredenciales {
  configurado: boolean;
  tieneSoftwareId?: boolean;
  tieneSoftwarePin?: boolean;
  tieneCertificado?: boolean;
  certificadoVenceEn?: string | null;
  proveedorTecnologico?: string | null;
}

/** Cuánto le queda a una resolución activa. Pedir una nueva a la DIAN toma días. */
export interface DisponibilidadResolucion {
  tipo_documento: string;
  ambiente: string;
  prefijo: string | null;
  numero_resolucion: string;
  rango_desde: string;
  rango_hasta: string;
  consecutivo_actual: string;
  numeros_restantes: string;
  fecha_vigencia_hasta: string;
  dias_restantes: number;
  vencida: boolean;
  agotada: boolean;
}

export const resolucionesApi = {
  listar: () => api.get<Resolucion[]>("/resoluciones").then((r) => r.data),
  /** Cuántos números quedan y cuándo vence cada resolución activa. */
  disponibilidad: () =>
    api
      .get<DisponibilidadResolucion[]>("/resoluciones/disponibilidad")
      .then((r) => r.data),
  crear: (datos: Record<string, unknown>) =>
    api.post<Resolucion>("/resoluciones", datos).then((r) => r.data),
  desactivar: (id: string) =>
    api.post(`/resoluciones/${id}/desactivar`).then(() => undefined),
  credenciales: () =>
    api
      .get<EstadoCredenciales>("/resoluciones/credenciales")
      .then((r) => r.data),
  guardarCredenciales: (datos: Record<string, unknown>) =>
    api.put("/resoluciones/credenciales", datos).then(() => undefined),
};
