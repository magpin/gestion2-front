import type { FiltroPaginado } from "@/core/types/pagination.types";

// Espejo de `venta` y `venta_detalle` (backend/src/modules/ventas).
//
// Los `numeric` de Postgres llegan como string por el driver: todo lo que sea
// plata se pasa por `Number()` antes de mostrarse. Se tipan como number porque
// el módulo los normaliza al leer, no porque el JSON los mande así.

export type CondicionVenta = "CONTADO" | "CREDITO";

export interface VentaDetalle {
  id: string;
  ventaId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  /** Foto del promedio ponderado al vender. Congelado para siempre. */
  costoUnitario: number;
  /** `ultimoCostoCompra × (1 + margen mínimo)`, congelado al vender. */
  precioPiso: number;
  /** NULL con el precio bajo el piso = PENDIENTE de la firma del director. */
  precioAutorizadoPorId: string | null;
  autorizadoEn: string | null;
  porcentajeIva: number;
  subtotal: number;
}

/**
 * La venta de mostrador.
 *
 * No tiene número propio: lo aporta la factura, que también sirve a las órdenes
 * de trabajo. Mientras no se emita, la venta se identifica por fecha y cliente.
 */
export interface Venta {
  id: string;
  empresaId: string;
  terceroId: string;
  fecha: string;
  condicion: CondicionVenta;
  subtotal: number;
  iva: number;
  /** Lo que el cliente le retuvo a la empresa. No baja el total, baja el saldo. */
  retefuenteFavor: number;
  costoTotal: number;
  total: number;
  saldoPendiente: number;
  asientoId: string;
  /** El segundo asiento. NULL si no salió mercancía del kardex. */
  asientoCostoId: string | null;
  anulada: boolean;
  motivoAnulacion: string | null;
  observacion: string | null;
  creadoPorId: string;
  creadoEn: string;
  actualizadoEn: string;
  /** Presente solo en el detalle (`GET /ventas/:id`). */
  detalles?: VentaDetalle[];
}

export interface LineaVentaPayload {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  porcentajeIva?: number;
}

export interface NuevaVentaPayload {
  terceroId: string;
  fecha?: string;
  condicion?: CondicionVenta;
  /** Si no viene y el cliente es agente retenedor, el backend calcula el 2,5 %. */
  retefuenteFavor?: number;
  observacion?: string;
  lineas: LineaVentaPayload[];
}

export interface FiltrosVenta extends FiltroPaginado {
  terceroId?: string;
  desde?: string;
  hasta?: string;
  soloPendientes?: boolean;
  incluirAnuladas?: boolean;
}

/** Una línea esperando la firma del director (`GET /autorizaciones/precios`). */
export interface LineaPendienteAutorizacion {
  ventaDetalleId: string;
  ventaId: string;
  fecha: string;
  terceroId: string;
  productoId: string;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  precioPiso: number;
  /** Cuánta plata se deja de ganar si se firma. Es el dato de la decisión. */
  diferencia: number;
}

export const CONDICIONES_VENTA: { id: CondicionVenta; label: string }[] = [
  { id: "CONTADO", label: "Contado" },
  { id: "CREDITO", label: "Crédito" },
];

/** Las tres tarifas que admite el CHECK de la base. */
export const PORCENTAJES_IVA = [0, 5, 19] as const;

/** El estado de una venta se DERIVA: no hay columna que lo guarde. */
export type EstadoVenta = "ANULADA" | "PAGADA" | "PENDIENTE";

export function estadoDeVenta(venta: Venta): EstadoVenta {
  if (venta.anulada) return "ANULADA";
  return Number(venta.saldoPendiente) > 0 ? "PENDIENTE" : "PAGADA";
}

/** Una línea bajo el piso sin firmar bloquea la emisión de la factura. */
export function lineaPendienteDeFirma(linea: VentaDetalle): boolean {
  return (
    linea.precioAutorizadoPorId === null &&
    Number(linea.precioUnitario) < Number(linea.precioPiso)
  );
}
