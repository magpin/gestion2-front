import axios from "axios";

import { env } from "@/core/config/env";
import type { DetalleConsumo, TableroConsumo } from "@/modules/consumo-ia/consumo";
import type {
  AdministradorPlataforma,
  AdminPlataforma,
  Anuncio,
  EstadoSistema,
  Suscripcion,
  DetalleCuenta,
  FiltroCuentas,
  Inicio,
  OrdenCuentas,
  PaginaBitacora,
  PaginaCuentas,
  PlanConCuentas,
  ResultadoBusqueda,
} from "../types/plataforma.types";

/**
 * Cliente propio, no el de la aplicación.
 *
 * El interceptor del cliente manda el token de la contabilidad en sesión; este
 * manda el de administración, que se guarda aparte. Los dos vuelven a `/login`
 * ante un 401 —la puerta es una sola—, pero compartir el cliente haría que
 * administrar el producto cierre la sesión de la contabilidad, o al revés.
 */
const CLAVE_TOKEN = "plataforma-token";

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem(CLAVE_TOKEN) : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(CLAVE_TOKEN);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export const sesionPlataforma = {
  guardar: (token: string) => localStorage.setItem(CLAVE_TOKEN, token),
  token: () => (typeof window !== "undefined" ? localStorage.getItem(CLAVE_TOKEN) : null),
  cerrar: () => localStorage.removeItem(CLAVE_TOKEN),
};

export interface ConsultaCuentas {
  q?: string;
  filtro?: FiltroCuentas;
  orden?: OrdenCuentas;
  dir?: "asc" | "desc";
  pagina?: number;
}

export interface FiltroConsumo {
  desde: string;
  hasta: string;
  cuentaId?: string | null;
  empresaId?: string | null;
}

/** Lo que devuelve un alta o un restablecimiento: la contraseña, una sola vez. */
export interface ConContrasena {
  email: string;
  password?: string;
}

/** El tablero de siempre, con la cuenta de cada empresa para el filtro. */
export type TableroConsumoPlataforma = Omit<TableroConsumo, "empresas"> & {
  empresas: { id: string; nombre: string; cuentaId: string; cuenta: string }[];
};

const params = (o: object) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );

const consumo = (f: FiltroConsumo) =>
  params({ desde: f.desde, hasta: f.hasta, cuenta: f.cuentaId, empresa: f.empresaId });

export const plataformaService = {
  // No hay `login` acá: se entra por `/login` como todo el mundo. El backend
  // responde con `ambito: "PLATAFORMA"` y `useAuth` guarda el token.

  yo: () => api.get<AdminPlataforma>("/plataforma/auth/yo").then((r) => r.data),

  inicio: () => api.get<Inicio>("/plataforma/inicio").then((r) => r.data),

  buscar: (q: string) =>
    api.get<ResultadoBusqueda>("/plataforma/buscar", { params: { q } }).then((r) => r.data),

  cuentas: (c: ConsultaCuentas) =>
    api.get<PaginaCuentas>("/plataforma/cuentas", { params: params(c) }).then((r) => r.data),

  /** El Excel de las cuentas del filtro. Se descarga en el navegador. */
  exportarCuentas: async (c: ConsultaCuentas) => {
    const r = await api.get<Blob>("/plataforma/cuentas/exportar", {
      params: params({ ...c, pagina: undefined }),
      responseType: "blob",
    });
    const disposicion = String(r.headers["content-disposition"] ?? "");
    const nombre = /filename="([^"]+)"/.exec(disposicion)?.[1] ?? "cuentas.xlsx";
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  },

  cuenta: (id: string) =>
    api.get<DetalleCuenta>(`/plataforma/cuentas/${id}`).then((r) => r.data),

  crearCuenta: (datos: {
    email: string;
    nombreCuenta: string;
    nombreAdministrador: string;
    plan: string;
    maxEmpresas?: number;
    maxUsuarios?: number;
  }) =>
    api
      .post<{ tenantId: string; usuarioId: string } & ConContrasena>("/plataforma/cuentas", datos)
      .then((r) => r.data),

  renombrar: (id: string, nombre: string) =>
    api.patch(`/plataforma/cuentas/${id}`, { nombre }).then((r) => r.data),

  cambiarPlan: (id: string, plan: string, aceptarExceso = false) =>
    api.patch(`/plataforma/cuentas/${id}/plan`, { plan, aceptarExceso }).then((r) => r.data),

  cambiarEstado: (id: string, estado: string, motivo?: string) =>
    api.patch(`/plataforma/cuentas/${id}/estado`, { estado, motivo }).then((r) => r.data),

  ajustarCupos: (id: string, cupos: { maxEmpresas?: number; maxUsuarios?: number }) =>
    api.patch(`/plataforma/cuentas/${id}/cupos`, cupos).then((r) => r.data),

  crearEmpresa: (id: string, datos: Record<string, unknown>) =>
    api.post(`/plataforma/cuentas/${id}/empresas`, datos).then((r) => r.data),

  crearUsuario: (id: string, datos: Record<string, unknown>) =>
    api
      .post<{ usuarioId: string } & ConContrasena>(`/plataforma/cuentas/${id}/usuarios`, datos)
      .then((r) => r.data),

  restablecer: (id: string, usuarioId: string) =>
    api
      .post<ConContrasena & { nombreCompleto: string; password: string }>(
        `/plataforma/cuentas/${id}/usuarios/${usuarioId}/restablecer`,
      )
      .then((r) => r.data),

  desactivar: (id: string, usuarioId: string) =>
    api.post(`/plataforma/cuentas/${id}/usuarios/${usuarioId}/desactivar`).then((r) => r.data),

  reactivar: (id: string, usuarioId: string) =>
    api.post(`/plataforma/cuentas/${id}/usuarios/${usuarioId}/reactivar`).then((r) => r.data),

  bitacora: (f: {
    cuenta?: string;
    admin?: string;
    accion?: string;
    desde?: string;
    hasta?: string;
    pagina?: number;
  }) =>
    api.get<PaginaBitacora>("/plataforma/bitacora", { params: params(f) }).then((r) => r.data),

  planes: () => api.get<PlanConCuentas[]>("/plataforma/planes").then((r) => r.data),

  editarPlan: (clave: string, cupos: { maxEmpresas?: number; maxUsuarios?: number }) =>
    api.patch(`/plataforma/planes/${clave}`, cupos).then((r) => r.data),

  editarPrecio: (clave: string, datos: { precioMensual?: number; topeIaUsd?: number }) =>
    api.patch(`/plataforma/planes/${clave}/precio`, datos).then((r) => r.data),

  suscripcion: (id: string) =>
    api.get<Suscripcion>(`/plataforma/cuentas/${id}/suscripcion`).then((r) => r.data),

  cambiarSuscripcion: (id: string, datos: { precioPactado?: number | null; diaCorte?: number }) =>
    api.patch(`/plataforma/cuentas/${id}/suscripcion`, datos).then((r) => r.data),

  registrarPago: (
    id: string,
    datos: { fecha: string; monto: number; medio: string; referencia?: string },
  ) =>
    api
      .post<{ pagoId: string; reactivada: boolean }>(`/plataforma/cuentas/${id}/pagos`, datos)
      .then((r) => r.data),

  sistema: () => api.get<EstadoSistema>("/plataforma/sistema").then((r) => r.data),

  pausarIa: (datos: { cuentaId?: string; usos: string[]; motivo: string }) =>
    api.post("/plataforma/sistema/pausas", datos).then((r) => r.data),

  reanudarIa: (id: string) =>
    api.post(`/plataforma/sistema/pausas/${id}/reanudar`).then((r) => r.data),

  anuncios: () => api.get<Anuncio[]>("/plataforma/anuncios").then((r) => r.data),

  publicarAnuncio: (datos: {
    titulo: string;
    cuerpo: string;
    tono: string;
    cuentas?: string[];
    desde: string;
    hasta: string;
  }) => api.post("/plataforma/anuncios", datos).then((r) => r.data),

  retirarAnuncio: (id: string) =>
    api.post(`/plataforma/anuncios/${id}/retirar`).then((r) => r.data),

  administradores: () =>
    api.get<AdministradorPlataforma[]>("/plataforma/administradores").then((r) => r.data),

  cambiarAdministrador: (id: string, activo: boolean) =>
    api
      .post(`/plataforma/administradores/${id}/${activo ? "reactivar" : "desactivar"}`)
      .then((r) => r.data),

  restablecerAdministrador: (id: string) =>
    api
      .post<{ email: string; nombreCompleto: string; password: string }>(
        `/plataforma/administradores/${id}/restablecer`,
      )
      .then((r) => r.data),

  // Del asistente, solo cifras: es el mismo tablero de `/consumo-ia`, con el
  // login de la consola y con filtro por cuenta.
  consumo: (f: FiltroConsumo) =>
    api
      .get<TableroConsumoPlataforma>(
        "/plataforma/consumo-ia",
        { params: consumo(f) },
      )
      .then((r) => r.data),

  consumoDetalle: (
    f: FiltroConsumo & { categoria?: string | null; orden?: string; pagina?: number },
  ) =>
    api
      .get<DetalleConsumo>("/plataforma/consumo-ia/detalle", {
        params: params({
          ...consumo(f),
          categoria: f.categoria,
          orden: f.orden,
          pagina: f.pagina,
        }),
      })
      .then((r) => r.data),
};
