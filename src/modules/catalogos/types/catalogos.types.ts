// Espejo de los catálogos normativos que expone `nucleo` en /catalogos.
//
// Todos son de solo lectura: los define el Estado y se corrigen por migración.
// Si dos empresas vieran catálogos distintos, sus informes dejarían de ser
// comparables.
//
// Los nombres de campo llegan como los devuelve Postgres (snake_case). No se
// renombran acá: cada renombre es una traducción más que mantener sincronizada
// con el backend.

/** Clase CIIU de 4 dígitos: la que va en el RUT y en `empresa_actividad_economica`. */
export interface CiiuClase {
  codigo: string;
  nombre: string;
  /** 'DANE' = actividad real. 'DIAN' = asalariado, pensionado, rentista. */
  origen: "DANE" | "DIAN";
  grupo_codigo: string | null;
  grupo_nombre: string | null;
  division_codigo: string | null;
  division_nombre: string | null;
  seccion_codigo: string | null;
  seccion_nombre: string | null;
}

export interface CiiuSeccion {
  codigo: string;
  nombre: string;
  divisiones: number;
}

export interface CiiuNivel {
  codigo: string;
  nombre: string;
}

/** Cuenta del Decreto 2650. Los cuatro niveles viven en la misma tabla. */
export interface CuentaPuc {
  codigo: string;
  /** 1 clase · 2 grupo · 4 cuenta · 6 subcuenta. Es la longitud del código. */
  nivel: 1 | 2 | 4 | 6;
  codigo_padre: string | null;
  nombre: string;
  naturaleza: "DEBITO" | "CREDITO";
  /** Solo el nivel 6 recibe asientos. */
  es_imputable: boolean;
  /**
   * El decreto no numera las hijas de este nodo: las define cada empresa. Un
   * nodo con `rango_libre` y sin hijas está completo, no incompleto.
   */
  rango_libre: boolean;
}

/** `/catalogos/puc/:codigo` agrega la ruta hasta la clase. */
export interface CuentaPucDetalle extends CuentaPuc {
  ruta: Array<{ codigo: string; nombre: string }>;
  hijas: number;
}

export interface HijasPuc {
  /** true con lista vacía = el decreto delega la numeración, no falta data. */
  rangoLibre: boolean;
  hijas: CuentaPuc[];
}

/** Casilla 53 del RUT. */
export interface ResponsabilidadRut {
  codigo: number;
  descripcion: string;
  vigente: boolean;
  codigo_reemplazo: number | null;
  observacion: string | null;
  /** Equivalente en el anexo de facturación electrónica, si viaja en el XML. */
  codigo_dian_fe: string | null;
}

/**
 * Las responsabilidades que viajan en el XML de la factura.
 *
 * Son seis, no las 48 del RUT: el anexo técnico solo transporta esas, más
 * `R-99-PN`, que no es una responsabilidad sino el relleno que exige cuando el
 * receptor no tiene ninguna.
 */
export interface ResponsabilidadFe {
  codigo: string;
  descripcion: string;
  codigo_rut: number | null;
  descripcion_rut: string | null;
}

/** Casilla 25 del RUT + anexo técnico de facturación electrónica. */
export interface TipoDocumento {
  codigo: string;
  descripcion: string;
  codigo_rut: number | null;
  codigo_dian_fe: number | null;
  aplica_persona: "NATURAL" | "JURIDICA" | "AMBAS";
}

/** Casilla 63. Solo personas jurídicas; la S.A.S. es el 12. */
export interface FormaAsociativa {
  codigo: string;
  descripcion: string;
}

export interface TipoContribuyente {
  codigo: number;
  descripcion: string;
  tipo_persona: "JURIDICA" | "NATURAL";
}
