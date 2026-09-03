import type { FiltroPaginado } from "@/core/types/pagination.types";

// Espejo de `producto` y `kardex` (backend/src/modules/inventario).

/**
 * El catálogo. Describe QUÉ es un producto, no cuánto hay.
 *
 * `stock` y `costoPromedio` NO son columnas: el backend los lee del kardex y
 * los agrega al responder. Guardar un contador de existencias acá es la receta
 * clásica para que el stock y sus movimientos digan cosas distintas.
 */
export interface Producto {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precioVenta: string;
  /**
   * Costo de REPOSICIÓN, distinto del promedio. Es el piso del precio: vender
   * por debajo no se bloquea, se autoriza. Lo escribe la compra; nadie lo digita.
   */
  ultimoCostoCompra: string;
  margenMinimoPct: string | null;
  porcentajeIva: string | null;
  manejaInventario: boolean;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
  /** Calculado desde el kardex. Solo viene en el listado y el detalle. */
  stock?: number;
  costoPromedio?: number;
  /**
   * Costo de reposición más el margen mínimo —el del producto si lo tiene, el
   * de la empresa si no—. Lo compone el backend: el margen de la empresa vive
   * en una configuración que solo el DIRECTOR puede leer, y la regla se escribe
   * una sola vez.
   */
  precioPiso?: number;
}

export type TipoMovimiento =
  | "COMPRA"
  | "VENTA"
  | "AJUSTE"
  | "CONSUMO_OT"
  | "REINTEGRO_OT"
  | "DEVOLUCION_VENTA"
  | "DEVOLUCION_COMPRA";

/**
 * Una línea del kardex. Append-only: un trigger rechaza cualquier edición o
 * borrado, venga de donde venga.
 */
export interface MovimientoKardex {
  id: string;
  /** Orden de REGISTRO del libro. El saldo se acumula por acá, no por fecha. */
  secuencia: string;
  productoId: string;
  fecha: string;
  tipo: TipoMovimiento;
  origenTipo: string | null;
  origenId: string | null;
  cantidad: string;
  costoUnitario: string;
  /** El saldo DESPUÉS de aplicarse: el stock se lee sin recalcular la historia. */
  saldoCantidad: string;
  saldoCostoPromedio: string;
  nota: string | null;
}

export interface CrearProductoPayload {
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioVenta?: number;
  margenMinimoPct?: number;
  porcentajeIva?: number;
  manejaInventario?: boolean;
}

export type ActualizarProductoPayload = Partial<Omit<CrearProductoPayload, "codigo" | "manejaInventario">> & {
  activo?: boolean;
};

/** Evento A5. El motivo es obligatorio: un ajuste sin explicación es un faltante escondido. */
export interface AjustePayload {
  productoId: string;
  conteoFisico: number;
  motivo: string;
  fecha?: string;
}

export interface ResultadoAjuste {
  productoId: string;
  stockAnterior: number;
  stockNuevo: number;
  diferencia: number;
  valorAjustado: number;
  kardexId: string;
  /** Null si el ajuste no movió valor. */
  asientoNumero: number | null;
}

export interface FiltrosProducto extends FiltroPaginado {
  incluirInactivos?: boolean;
}

// Alias con los nombres que ya usa el resto del módulo.
export type CreateProductoPayload = CrearProductoPayload;
export type UpdateProductoPayload = ActualizarProductoPayload;

/** ¿El stock está en el piso? Sin `stockMinimo` en el modelo, el umbral se pasa. */
export function bajoCritico(producto: Producto, minimo = 0): boolean {
  return (producto.stock ?? 0) <= minimo;
}

/** Los movimientos que ENTRAN al inventario. Los demás salen. */
export const MOVIMIENTO_ENTRA: Record<TipoMovimiento, boolean> = {
  COMPRA: true,
  DEVOLUCION_VENTA: true,
  REINTEGRO_OT: true,
  VENTA: false,
  CONSUMO_OT: false,
  DEVOLUCION_COMPRA: false,
  // Depende del signo de la cantidad: es el único de doble sentido.
  AJUSTE: false,
};

export const ETIQUETA_MOVIMIENTO: Record<TipoMovimiento, string> = {
  COMPRA: "Compra",
  VENTA: "Venta",
  AJUSTE: "Ajuste por conteo",
  CONSUMO_OT: "Consumo en OT",
  REINTEGRO_OT: "Reintegro de OT",
  DEVOLUCION_VENTA: "Devolución de venta",
  DEVOLUCION_COMPRA: "Anulación de compra",
};
