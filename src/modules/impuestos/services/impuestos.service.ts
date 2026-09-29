import { api } from "@/core/api/api";
import type {
  AvisoImpuestos,
  Calendario,
  ConfiguracionImpuestos,
  DatosPago,
  DatosPresentacion,
  Declaracion,
  FilaCalendario,
  IcaPantalla,
  IvaPantalla,
  RentaPantalla,
  ZomacTamano,
  PagoPrevio,
  PeriodicidadIva,
  RetencionDelMes,
} from "../types/impuestos.types";

export const impuestosApi = {
  configuracion: () => api.get<ConfiguracionImpuestos>("/impuestos/configuracion").then((r) => r.data),

  guardarConfiguracion: (periodicidadIva: PeriodicidadIva | null) =>
    api.put<ConfiguracionImpuestos>("/impuestos/configuracion", { periodicidadIva }).then((r) => r.data),

  calendario: (anio?: number) =>
    api.get<Calendario>("/impuestos/calendario", { params: { anio } }).then((r) => r.data),

  iva: (periodo?: string) =>
    api.get<IvaPantalla>("/impuestos/iva", { params: { periodo } }).then((r) => r.data),

  ica: (municipio?: string, periodo?: string) =>
    api.get<IcaPantalla>("/impuestos/ica", { params: { municipio, periodo } }).then((r) => r.data),

  guardarAvisos: (municipioCodigo: string, avisosTableros: boolean) =>
    api.put("/impuestos/ica/avisos", { municipioCodigo, avisosTableros }).then((r) => r.data),

  renta: () => api.get<RentaPantalla>("/impuestos/renta").then((r) => r.data),

  guardarZomac: (zomacTamano: ZomacTamano | null) =>
    api.put<ConfiguracionImpuestos>("/impuestos/renta/zomac", { zomacTamano }).then((r) => r.data),

  retencion: (mes: string) =>
    api.get<RetencionDelMes>("/impuestos/retencion", { params: { mes } }).then((r) => r.data),

  porPagar: () => api.get<FilaCalendario[]>("/impuestos/por-pagar").then((r) => r.data),

  aviso: () => api.get<AvisoImpuestos | null>("/impuestos/aviso").then((r) => r.data),

  presentar: (datos: DatosPresentacion) =>
    api.post<Declaracion>("/impuestos/declaraciones", datos).then((r) => r.data),

  corregir: (id: string, datos: Omit<DatosPresentacion, "obligacion" | "periodo" | "municipioCodigo">) =>
    api.put<Declaracion>(`/impuestos/declaraciones/${id}`, datos).then((r) => r.data),

  pagoPrevio: (id: string, intereses: number) =>
    api
      .get<PagoPrevio>(`/impuestos/declaraciones/${id}/pago-previo`, { params: { intereses } })
      .then((r) => r.data),

  pagar: (id: string, datos: DatosPago) =>
    api.post<Declaracion>(`/impuestos/declaraciones/${id}/pagar`, datos).then((r) => r.data),

  /** Un enlace de lectura al PDF del formulario. */
  archivo: (id: string) =>
    api.get<{ url: string; nombre: string | null }>(`/impuestos/declaraciones/${id}/archivo`).then((r) => r.data),

  /**
   * Sube el PDF del formulario directo al bucket y devuelve su llave.
   *
   * Con `fetch` y no con axios, como en las lecturas: el cliente de axios le
   * pega el token de sesión a cada petición, y mandárselo al almacenamiento
   * —que ya viene autorizado en la firma— sería regalarlo.
   */
  subirArchivo: async (archivo: File): Promise<{ clave: string; nombre: string }> => {
    const tipoMime = archivo.type || "application/pdf";
    const { url, clave } = await api
      .post<{ url: string; clave: string }>("/impuestos/declaraciones/archivo", { tipoMime })
      .then((r) => r.data);
    const respuesta = await fetch(url, { method: "PUT", headers: { "Content-Type": tipoMime }, body: archivo });
    if (!respuesta.ok) {
      throw new Error(`El archivo no se pudo subir (${respuesta.status}). Revisá que el almacenamiento esté disponible.`);
    }
    return { clave, nombre: archivo.name };
  },
};
