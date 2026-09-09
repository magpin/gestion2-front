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
  fecha: string;
  numero_factura_proveedor: string;
  estado: EstadoCompra;
  /** Los cinco montos: `numeric` de Postgres, serializado como texto. */
  subtotal: string;
  total_iva: string;
  total: string;
  total_retenciones: string;
  neto_a_pagar: string;
  asiento_id: string;
}

export interface CompraDocumentoLineaResumen {
  id: string;
  compra_documento_id: string;
  orden: number;
  producto_id: string;
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
