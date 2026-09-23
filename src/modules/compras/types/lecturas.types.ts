// Espejo de `/facturas-leidas` — el módulo `lectura-documentos` del backend
// visto desde compras.
//
// **Una factura leída no es una compra.** Es una propuesta: lo que María
// entendió del papel, lo que pudo cruzar contra el sistema y lo que le falta
// preguntar. La compra existe recién cuando una persona la registra.
//
// Por qué esto no reusa los tipos del asistente (`asistente.types.ts`): allá
// una lectura es una lista plana de `campo · valor` para configurar la empresa.
// Una factura es una cabecera con renglones, y esa diferencia es la razón por
// la que el backend le hizo un camino aparte.

/** DESCARTADO: una persona la dejó sin registrar, con su motivo (0067). */
export type EstadoLectura = "EN_COLA" | "LEYENDO" | "LEIDO" | "FALLO" | "DESCARTADO";

/** Un renglón del papel, tal como está escrito. Todavía sin interpretar. */
export interface RenglonLeido {
  codigo: string | null;
  descripcion: string;
  /** Mercancía o gasto: decide contra qué se cruza. */
  clase: "PRODUCTO" | "GASTO";
  /** El código del PUC, si el documento lo imprime. Casi nunca lo hace. */
  cuentaPuc: string | null;
  cantidad: number;
  valorUnitario: number;
  ivaTarifa: number;
  total: number;
}

export interface FacturaLeida {
  proveedor: { nombre: string; nit: string | null };
  /** El que puso el proveedor. `null` en una cuenta de cobro. */
  numero: string | null;
  prefijo: string | null;
  fecha: string;
  renglones: RenglonLeido[];
  /** Lo que el documento tiene **escrito**. Contra esto se comprueba. */
  impreso: {
    subtotal: number;
    iva: number;
    retencion: number;
    total: number;
  };
}

/**
 * Una suma del código contra un total impreso. Trae los dos números y no un
 * «cuadra / no cuadra», porque cuando algo no da hay que poder decir **qué** no
 * dio: «sumé 3.485.293 y el papel dice 3.585.293» es accionable.
 */
export interface Comprobacion {
  que: string;
  cuadra: boolean;
  /** Lo que suman los renglones. */
  calculado: number;
  /** Lo que dice el papel. */
  impreso: number;
}

/** Contra qué apunta un renglón después de buscarlo, o `null` si hay que preguntar. */
export type RenglonResuelto = {
  clase: "PRODUCTO" | "GASTO";
  id: string;
  codigo: string;
  nombre: string;
} | null;

export interface RenglonCruzado {
  /** El orden del papel: es cómo se lo nombra al preguntar. */
  orden: number;
  leido: RenglonLeido;
  resuelto: RenglonResuelto;
  /** Cómo se resolvió, o por qué no. Ya escrito para leerse. */
  motivo: string;
  /**
   * Por qué camino se encontró. `APRENDIDO` lo contestó una persona en otra
   * factura del mismo proveedor, y es lo único resuelto que se puede cambiar
   * acá. Ausente en lecturas anteriores a la memoria.
   */
  forma?: "CODIGO" | "NOMBRE_EXACTO" | "UNICA_COINCIDENCIA" | "NIT" | "APRENDIDO";
}

/** Lo que falta. `sobre` es `proveedor`, `numero` o `renglon-3`. */
export interface PreguntaLectura {
  sobre: string;
  texto: string;
}

export interface FacturaCruzada {
  factura: FacturaLeida;
  comprobaciones: Comprobacion[];
  proveedor: { id: string; nombre: string } | null;
  renglones: RenglonCruzado[];
  /** Cuántos renglones del mismo producto se juntaron al costo promedio. */
  juntadas: number;
  preguntas: PreguntaLectura[];
  /** Sin preguntas **y** con las cuentas dando. Registrar lo pide una persona. */
  completa: boolean;
}

export interface LecturaFactura {
  id: string;
  tipo: "FACTURA_COMPRA";
  estado: EstadoLectura;
  claveAlmacenamiento: string;
  /**
   * La factura cruzada, o `null` mientras se lee. Viene sin interpretar desde
   * `documento_leido.extraido`: la base no mira adentro (migración 0061).
   */
  extraido: FacturaCruzada | null;
  /**
   * En qué compra terminó, si alguien ya la registró. Sin esto la lista miente:
   * dos lecturas del mismo documento se ven idénticas cuando una ya es una
   * compra, y la pantalla sigue ofreciendo registrarla.
   */
  compra: { id: string; numero: string; estado: string } | null;
  /** Por qué no se pudo leer. En palabras, nunca la traza del error. */
  error: string | null;
  creadoEn: string;
  leidoEn: string | null;
  /** Por qué se descartó. Solo en DESCARTADO. */
  motivoDescarte: string | null;
}

/** Lo que una persona responde de lo que el cruce no pudo. */
export interface RegistrarLecturaInput {
  /** Si el documento no traía número: una cuenta de cobro no lo trae. */
  numero?: string;
  /** Si el proveedor no se encontró por NIT. */
  terceroId?: string;
  /** Qué es cada renglón sin resolver. Uno de los dos, no los dos. */
  renglones?: Array<{
    orden: number;
    productoId?: string;
    cuentaId?: string;
  }>;
  formaPago?: "CREDITO" | "CONTADO";
}

/** Lo que devuelve firmar la subida: la llave la decide el servidor. */
export interface UrlDeCargaLectura {
  url: string;
  clave: string;
}
