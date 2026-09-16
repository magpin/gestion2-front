import type { MedioPagoInput } from "@/modules/tesoreria/types/tesoreria.types";

// Espejo de `/compras` y `/compras/notas`.
//
// Tres tipos sobre la misma tabla —factura del proveedor, nota crédito y
// nota débito—: no hay cotización, que es la única de ventas que acá no tiene
// equivalente. El número de los tres lo pone el proveedor, no nosotros.

export type EstadoCompra = "EMITIDA" | "ANULADA";
/** Desde el paso 7: `compra_documento` ya no guarda solo facturas. */
export type TipoCompraDocumento = "FACTURA" | "NOTA_CREDITO" | "NOTA_DEBITO";
export type ConceptoRetencion =
  | "HONORARIOS"
  | "COMISIONES"
  | "SERVICIOS"
  | "ARRENDAMIENTOS"
  | "COMPRAS"
  | "OTROS";

export const CONCEPTOS_RETENCION: Array<{
  valor: ConceptoRetencion;
  etiqueta: string;
}> = [
  { valor: "HONORARIOS", etiqueta: "Honorarios" },
  { valor: "COMISIONES", etiqueta: "Comisiones" },
  { valor: "SERVICIOS", etiqueta: "Servicios" },
  { valor: "ARRENDAMIENTOS", etiqueta: "Arrendamientos" },
  { valor: "COMPRAS", etiqueta: "Compras" },
  { valor: "OTROS", etiqueta: "Otros conceptos" },
];

export interface CompraDocumentoResumen {
  id: string;
  tipo: TipoCompraDocumento;
  /** La factura del proveedor que esta nota corrige. `null` en una factura. */
  documento_origen_id: string | null;
  tercero_id: string;
  /** Razón social o nombre completo: viene de la API para no resolverlo acá. */
  tercero_nombre: string;
  /** Ya formateada por el backend: `NIT 900123456-7`, `CC 19400748`. */
  tercero_identificacion: string;
  fecha: string;
  numero_factura_proveedor: string;
  estado: EstadoCompra;
  /** Los cinco montos: `numeric` de Postgres, serializado como texto. */
  subtotal: string;
  total_iva: string;
  total: string;
  total_retenciones: string;
  neto_a_pagar: string;
  /** Cuánto se le ha pagado al proveedor. */
  monto_pagado: string;
  /** Lo que las notas del proveedor le restaron (NC) o sumaron (ND). */
  ajuste_notas: string;
  /** `neto_a_pagar + ajuste_notas`: lo que hoy se le debe. Lo calcula la API. */
  neto_efectivo: string;
  /** Lo que falta por pagarle, nunca negativo. Ver `pendiente` en ventas. */
  pendiente: string;
  /** Lo pagado de más: plata que el proveedor tiene que devolver. */
  saldo_a_favor: string;
  asiento_id: string;
}

export interface CompraDocumentoLineaResumen {
  id: string;
  compra_documento_id: string;
  orden: number;
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  cantidad: string;
  costo_unitario: string;
  iva_tarifa: string;
  subtotal: string;
  iva_valor: string;
  total: string;
  iva_descontable: boolean;
}

export interface CompraRetencionResumen {
  id: string;
  compra_documento_id: string;
  concepto: ConceptoRetencion;
  cuenta_id: string;
  base: string;
  valor: string;
}

export interface CompraDocumentoDetalle extends CompraDocumentoResumen {
  lineas: CompraDocumentoLineaResumen[];
  retenciones: CompraRetencionResumen[];
  /** En una nota: la factura del proveedor que corrige. */
  documento_origen?: CompraDocumentoResumen | null;
  /** En una factura: las notas del proveedor que le apuntan. */
  notas?: CompraDocumentoResumen[];
}

export interface PaginaCompras {
  datos: CompraDocumentoResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface FiltroCompras {
  terceroId?: string;
  pagina?: number;
}

export interface LineaCompraInput {
  productoId: string;
  cantidad: number;
  /** El costo que dice la factura del proveedor — no un precio de catálogo. */
  costoUnitario: number;
  /**
   * "Esta línea vino sin IVA aunque debería llevarlo". Solo baja a cero: poner
   * IVA donde el proveedor no lo cobró sería inventar un descontable que nadie
   * pagó.
   */
  sinIva?: boolean;
}

/** Base y valor son manuales: este corte no calcula tarifas de retención. */
export interface RetencionCompraInput {
  concepto: ConceptoRetencion;
  base: number;
  valor: number;
}

export interface CrearCompraInput {
  terceroId: string;
  fecha: string;
  numeroFacturaProveedor: string;
  lineas: LineaCompraInput[];
  retenciones?: RetencionCompraInput[];
}

/**
 * Paga una compra repartida entre uno o varios medios. Espejo de
 * `CobrarInput` de ventas, que explica el porqué.
 */
export interface PagarInput {
  fecha: string;
  pagos: MedioPagoInput[];
}

/** Una línea de la compra que la nota crédito corrige, y por cuánto. */
export interface LineaNotaCreditoCompraInput {
  lineaOrigenId: string;
  cantidad: number;
}

/**
 * Nota crédito del proveedor: baja lo que se le debe. Sin `lineas` devuelve
 * la compra completa —menos lo que notas anteriores ya devolvieron—; con
 * ellas, solo esas cantidades.
 */
export interface CrearNotaCreditoCompraInput {
  documentoOrigenId: string;
  fecha: string;
  /** El número que el proveedor le puso a SU nota, que no es el de la factura. */
  numeroNotaProveedor: string;
  motivo: string;
  lineas?: LineaNotaCreditoCompraInput[];
}

/** Lo que el proveedor cobra de más: un concepto nuevo, con su costo. */
export interface LineaNotaDebitoCompraInput {
  productoId: string;
  cantidad: number;
  costoUnitario: number;
}

/** Nota débito del proveedor: sube lo que se le debe. Siempre lleva líneas. */
export interface CrearNotaDebitoCompraInput {
  documentoOrigenId: string;
  fecha: string;
  numeroNotaProveedor: string;
  motivo: string;
  lineas: LineaNotaDebitoCompraInput[];
}
