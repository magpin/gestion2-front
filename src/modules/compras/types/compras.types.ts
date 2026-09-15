// Espejo de `/compras`.
//
// Un solo tipo de documento —a diferencia de ventas, acá no hay cotización
// ni nota crédito de proveedor en este corte (ver "Qué NO entra" en
// `docs/planes/compras-backend.md`).

export type EstadoCompra = "EMITIDA" | "ANULADA";
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
 * Paga por caja o por banco — `cajaId`/`cuentaBancariaId` son
 * mutuamente excluyentes, discriminados por `medio` (mismo criterio que
 * el `PagarDto` del backend). El concepto lo arma el backend con el
 * número de factura del proveedor.
 */
export type PagarInput = { fecha: string; valor: number } & (
  | { medio: "CAJA"; cajaId: string }
  | { medio: "BANCO"; cuentaBancariaId: string }
);
