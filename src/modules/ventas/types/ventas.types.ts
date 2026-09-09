// Espejo de `/cotizaciones`, `/facturas` y `/notas-credito`.
//
// Un solo documento con tres tipos, no tres formas distintas: comparten
// cabecera y líneas, lo que cambia es la regla de negocio (si numera contra
// una resolución DIAN, si asienta, si mueve inventario). Mismo criterio que
// ya explica `docs/planes/ventas-backend.md`.

export type TipoVentaDocumento = "COTIZACION" | "FACTURA" | "NOTA_CREDITO";
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
  asiento_id: string | null;
}

export interface VentaDocumentoLineaResumen {
  id: string;
  venta_documento_id: string;
  orden: number;
  producto_id: string;
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
}

export interface CrearCotizacionInput {
  terceroId: string;
  fecha: string;
  lineas: LineaDocumentoInput[];
}

export interface CrearFacturaInput {
  terceroId: string;
  fecha: string;
  lineas: LineaDocumentoInput[];
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
}
