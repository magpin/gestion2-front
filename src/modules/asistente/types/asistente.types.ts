/**
 * El contrato del asistente, copiado del backend.
 *
 * Son los tipos de `backend/src/modules/lectura-documentos`. Lo que la pantalla
 * muestra sale de ahí y de ningún otro lado: si un dato no lo devuelve un
 * endpoint, no se dibuja.
 */

/** Los tres documentos que el asistente sabe leer. */
export type TipoDocumento = "RUT" | "CAMARA_COMERCIO" | "RESOLUCION_DIAN";

export type EstadoDocumento = "EN_COLA" | "LEYENDO" | "LEIDO" | "FALLO";

/** A qué paso de la configuración alimenta un dato. */
export type ClavePaso =
  | "EMPRESA"
  | "SEDES"
  | "SITUACION_LEGAL"
  | "PLAN_CUENTAS"
  | "RESOLUCIONES";

/**
 * Un hecho que el documento propone, todavía sin aplicar.
 *
 * `DUDOSA` no se aplica nunca: se pregunta. La pantalla lo trata igual que el
 * backend, no porque lo repita, sino porque el backend lo rechaza si intenta
 * otra cosa.
 */
export interface DatoExtraido {
  paso: ClavePaso;
  campo: string;
  valor: unknown;
  etiqueta: string;
  fuente: { documento: TipoDocumento; casilla?: string };
  confianza: "ALTA" | "DUDOSA";
}

export interface Documento {
  id: string;
  tipo: TipoDocumento;
  estado: EstadoDocumento;
  claveAlmacenamiento: string;
  datos: DatoExtraido[];
  error: string | null;
  creadoEn: string;
  leidoEn: string | null;
  /** Cuándo una persona confirmó lo leído (0068). Con esto no se vuelve a pedir. */
  confirmadoEn?: string | null;
  confirmacion?: ResultadoConfirmacion | null;
}

/** Un evento del flujo `GET /configuracion/ia/progreso`. */
export interface EventoProgreso {
  etapa: "EN_COLA" | "LEYENDO" | "EXTRAYENDO" | "LISTO" | "ERROR";
  documento: TipoDocumento;
  documentoId: string;
  mensaje: string;
  datos: DatoExtraido[];
}

/** Lo que devuelve confirmar: qué quedó guardado y qué no, con su motivo. */
export interface ResultadoConfirmacion {
  aplicados: string[];
  sinAplicar: Array<{ campo: string; etiqueta: string; motivo: string }>;
}

/** La URL firmada para subir al bucket, y la llave con la que se registra. */
export interface UrlDeCarga {
  url: string;
  clave: string;
}

/** Cómo se nombra cada documento dentro de una frase. */
export const NOMBRE_DOCUMENTO: Record<TipoDocumento, string> = {
  RUT: "el RUT",
  CAMARA_COMERCIO: "la Cámara de Comercio",
  RESOLUCION_DIAN: "la resolución de la DIAN",
};

/** Cómo se titula cada documento en una fila de la tarjeta. */
export const TITULO_DOCUMENTO: Record<TipoDocumento, string> = {
  RUT: "RUT",
  CAMARA_COMERCIO: "Cámara de Comercio",
  RESOLUCION_DIAN: "Resolución DIAN",
};

/** El orden en que se piden: es el orden en que los pasos los necesitan. */
export const DOCUMENTOS: TipoDocumento[] = [
  "RUT",
  "CAMARA_COMERCIO",
  "RESOLUCION_DIAN",
];

/**
 * Lo que se sube desde el pie del chat, sin decir qué es. El mismo juego que
 * `TIPOS_SUBIBLES` del backend (`lectura-documentos/reglas/contenido.ts`). Lo
 * que no está acá viaja como `application/octet-stream`: el servidor igual lo
 * mira y dice qué es, o que no lo puede abrir.
 */
export const TIPOS_SUBIBLES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain",
  "application/xml",
  "text/xml",
  "application/json",
] as const;

/** El tipo con el que se firma y se sube un archivo del pie del chat. */
export const tipoMimeDe = (archivo: File): string =>
  (TIPOS_SUBIBLES as readonly string[]).includes(archivo.type)
    ? archivo.type
    : "application/octet-stream";

/** Lo que dice el asistente de un archivo que se subió sin decir qué es. */
export interface ResultadoAnalisis {
  /** La lectura que arrancó, si era RUT, Cámara o Resolución; si no, `null`. */
  documento: Documento | null;
  clase: string;
  resumen: string;
}

/** Lo que el bucket acepta para los tres documentos. El backend rechaza lo demás antes de firmar. */
export const TIPOS_ACEPTADOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/**
 * Un turno de la conversación.
 *
 * No hay endpoint de conversación: **esto no se guarda en ninguna parte**. Es el
 * registro de lo que pasó mientras la pantalla estuvo abierta, armado con los
 * eventos reales del backend. Al recargar, lo que queda es el estado de los
 * documentos y lo extraído, que sí viven en la base.
 */
export type Turno =
  | { id: string; autor: "PERSONA"; texto?: string; archivo?: string }
  | {
      id: string;
      autor: "ASISTENTE";
      texto?: string;
      tarjeta?: TarjetaTurno;
    };

export type TarjetaTurno =
  | { clase: "DOCUMENTOS" }
  | { clase: "EXTRAIDO" }
  | { clase: "FALLA"; titulo: string; detalle: string; tipo: TipoDocumento }
  | { clase: "CONFIRMADO"; resultado: ResultadoConfirmacion };
