// Espejo de `/cotizaciones`, `/facturas` y `/notas-credito`.
//
// Un solo documento con tres tipos, no tres formas distintas: comparten
// cabecera y líneas, lo que cambia es la regla de negocio (si numera contra
// una resolución DIAN, si asienta, si mueve inventario). Mismo criterio que
// ya explica `docs/planes/ventas-backend.md`.

export type TipoVentaDocumento =
  | "COTIZACION"
  | "FACTURA"
  | "NOTA_CREDITO"
  | "NOTA_DEBITO";
/** `CONVERTIDA` es exclusivo de COTIZACION: la que ya se pasó a factura. */
export type EstadoVentaDocumento =
  | "BORRADOR"
  | "EMITIDA"
  | "CONVERTIDA"
  | "ANULADA";

export interface VentaDocumentoResumen {
  id: string;
  tipo: TipoVentaDocumento;
  tercero_id: string;
  /** Razón social o nombre completo: viene de la API para no resolverlo acá. */
  tercero_nombre: string;
  /** Ya formateada por el backend: `NIT 900123456-7`, `CC 19400748`. */
  tercero_identificacion: string;
  fecha: string;
  estado: EstadoVentaDocumento;
  prefijo: string | null;
  consecutivo: number;
  resolucion_id: string | null;
  documento_origen_id: string | null;
  /** Los cuatro montos: `numeric` de Postgres, serializado como texto. */
  subtotal: string;
  total_iva: string;
  total: string;
  /** Cuánto se ha cobrado. Siempre `"0"` en COTIZACION/NOTA_CREDITO — nadie cobra esas. */
  monto_pagado: string;
  /**
   * Lo que las notas no anuladas le sumaron o restaron: negativo por cada
   * nota crédito, positivo por cada nota débito. `"0"` si no tiene ninguna.
   */
  ajuste_notas: string;
  /** `total + ajuste_notas`: lo que el documento vale hoy. Lo calcula la API. */
  saldo_efectivo: string;
  /**
   * Lo que falta por cobrar, nunca negativo. **Es esto y no `total` lo que
   * decide si una factura se puede cobrar**: con una nota crédito encima, el
   * total dejó de ser lo que el cliente debe.
   */
  pendiente: string;
  /**
   * Lo cobrado de más: plata que hay que devolverle al cliente. Aparece
   * cuando una factura ya cobrada entera recibe después una nota crédito.
   */
  saldo_a_favor: string;
  asiento_id: string | null;
}

export interface VentaDocumentoLineaResumen {
  id: string;
  venta_documento_id: string;
  orden: number;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  cantidad: string;
  precio_unitario: string;
  iva_tarifa: string;
  subtotal: string;
  iva_valor: string;
  total: string;
  /** Solo FACTURA/NOTA_CREDITO. `null` en COTIZACION: no consulta el kardex. */
  costo_unitario: string | null;
}

export interface VentaDocumentoDetalle extends VentaDocumentoResumen {
  lineas: VentaDocumentoLineaResumen[];
  /**
   * En una nota: la factura que corrige. En una factura convertida de una
   * cotización: esa cotización. `null` cuando no hay ninguno.
   */
  documento_origen?: VentaDocumentoResumen | null;
  /**
   * En una factura: sus notas crédito y débito, anuladas incluidas —una nota
   * anulada explica por qué el saldo volvió a subir—.
   */
  notas?: VentaDocumentoResumen[];
}

export interface PaginaVentas {
  datos: VentaDocumentoResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface FiltroVentas {
  terceroId?: string;
  pagina?: number;
}

/** Sin `precioUnitario`: el precio es siempre el de lista vigente del producto. */
export interface LineaDocumentoInput {
  productoId: string;
  cantidad: number;
  /**
   * Solo en cotizaciones, y solo cuando el producto no tiene precio de lista:
   * si lo tiene, el backend manda el de lista y este se ignora.
   */
  precioUnitario?: number;
}

/**
 * El precio por línea solo lo acepta la cotización, y solo se manda cuando el
 * producto no tiene precio de lista: si lo tiene, el backend usa el de lista y
 * lo ignora.
 */
export interface CrearCotizacionInput {
  terceroId: string;
  fecha: string;
  lineas: LineaDocumentoInput[];
}

export interface CrearFacturaInput {
  terceroId: string;
  fecha: string;
  lineas: LineaDocumentoInput[];
  /**
   * "Sé que no hay existencia y la emito igual". No es un permiso: el backend
   * la rechaza igual si la empresa no habilitó el descubierto o si el producto
   * nunca tuvo una entrada (no habría costo con el que valorar la venta).
   */
  confirmaSinExistencia?: boolean;
}

/**
 * Qué se le cobra de más al cliente. A diferencia de la nota crédito —que
 * devuelve al precio de la factura—, acá el precio se digita siempre: lo que
 * se cobra es un valor nuevo, no uno del catálogo.
 */
export interface LineaNotaDebitoInput {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CrearNotaDebitoInput {
  /** La factura EMITIDA sobre la que se cobra. Sin factura no hay nota. */
  documentoOrigenId: string;
  fecha: string;
  motivo: string;
  lineas: LineaNotaDebitoInput[];
}

export interface CrearNotaCreditoInput {
  /** La factura EMITIDA que se corrige, completa — no hay notas parciales en este corte. */
  documentoOrigenId: string;
  fecha: string;
  motivo: string;
}

/**
 * Convertir una cotización en factura: solo la fecha — el cliente y las
 * líneas salen de la propia cotización, no se vuelven a pedir. El precio de
 * cada línea se recalcula contra el vigente en ese momento, no el que tenía
 * la cotización.
 */
export interface ConvertirCotizacionInput {
  fecha: string;
  /** Ver `CrearFacturaInput.confirmaSinExistencia`: la factura sale igual. */
  confirmaSinExistencia?: boolean;
}

/**
 * Cobra por caja o por banco — `cajaId`/`cuentaBancariaId` son
 * mutuamente excluyentes, discriminados por `medio` (mismo criterio que
 * el `CobrarDto` del backend). El concepto lo arma el backend con el
 * número de la factura.
 */
export type CobrarInput = { fecha: string; valor: number } & (
  | { medio: "CAJA"; cajaId: string }
  | { medio: "BANCO"; cuentaBancariaId: string }
);
