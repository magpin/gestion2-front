// Espejo de `/terceros`.
//
// Un tercero es con quién la empresa hace negocios: el que le compra, el que le
// vende, o los dos. No es un "cliente" y un "proveedor" por separado porque en
// la práctica el mismo NIT suele ser ambos, y duplicarlo obliga a mantener dos
// fichas del mismo señor.

export type TipoPersona = "NATURAL" | "JURIDICA";

/** Lo que devuelve la lista. Menos de lo que guarda la tabla, a propósito. */
export interface TerceroResumen {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  dv: string | null;
  /** Razón social, o el nombre armado de la persona natural. */
  nombre: string;
  esCliente: boolean;
  esProveedor: boolean;
  responsableIva: boolean;
  activo: boolean;
}

/**
 * La ficha completa. Llega con los nombres de columna de la base porque el
 * backend devuelve la fila tal cual: traducirla en el servicio agregaría un
 * mapeo que solo esta pantalla usa.
 */
export interface TerceroDetalle {
  id: string;
  tipo_persona: TipoPersona;
  tipo_documento: string;
  numero_documento: string;
  dv: string | null;
  razon_social: string | null;
  primer_nombre: string | null;
  segundo_nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  nombre_comercial: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  municipio_codigo: string | null;
  municipio_nombre: string | null;
  es_cliente: boolean;
  es_proveedor: boolean;
  responsable_iva: boolean;
  es_agente_retenedor: boolean;
  es_autorretenedor: boolean;
  es_gran_contribuyente: boolean;
  regimen_simple: boolean;
  /** Códigos del anexo técnico: O-13, O-48, R-99-PN. */
  responsabilidades_dian: string[];
  activo: boolean;
}

export interface PaginaTerceros {
  datos: TerceroResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface FiltroTerceros {
  q?: string;
  esCliente?: boolean;
  esProveedor?: boolean;
  incluirInactivos?: boolean;
  /** Solo los desactivados. Manda sobre `incluirInactivos`. */
  soloInactivos?: boolean;
  pagina?: number;
}

/**
 * La ficha completa vista como resumen: lo que piden los selectores.
 *
 * Hace falta al precargar un documento que ya existe —corregir una
 * cotización—: el documento guarda el id del tercero, y el selector trabaja
 * con el objeto. La ficha se pide igual para eso.
 */
export function resumirTercero(d: TerceroDetalle): TerceroResumen {
  return {
    id: d.id,
    tipoDocumento: d.tipo_documento,
    numeroDocumento: d.numero_documento,
    dv: d.dv,
    nombre:
      d.razon_social ??
      [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido]
        .filter((p) => p !== null && p !== "")
        .join(" "),
    esCliente: d.es_cliente,
    esProveedor: d.es_proveedor,
    responsableIva: d.responsable_iva,
    activo: d.activo,
  };
}
