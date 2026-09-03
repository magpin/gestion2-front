import type { FiltroPaginado } from "@/core/types/pagination.types";

// Espejo de `compra` y `compra_detalle` (backend/src/modules/compras).
//
// Los `numeric` de Postgres llegan como string por el driver: todo lo que sea
// plata se pasa por `Number()` antes de mostrarse. Se tipan como number porque
// el módulo los normaliza al leer, no porque el JSON los mande así.

export type CondicionPago = "CONTADO" | "CREDITO";

export interface CompraDetalle {
  id: string;
  compraId: string;
  empresaId: string;
  productoId: string;
  cantidad: number;
  /** El costo de ESTA compra, no el promedio del kardex. */
  costoUnitario: number;
  porcentajeIva: number;
  /** GENERATED en la base: no puede desincronizarse de cantidad × costo. */
  subtotal: number;
}

/**
 * La factura del proveedor, registrada.
 *
 * `numeroFactura` es el número de ÉL: la empresa no numera lo que recibe. Por
 * eso no hay consecutivo propio y el UNIQUE de la base es
 * (empresa, tercero, número).
 *
 * No hay PATCH: una compra registrada ya movió el kardex y ya asentó. Corregir
 * es anular y volver a registrar, y un trigger lo impide también desde la base.
 */
export interface Compra {
  id: string;
  empresaId: string;
  /** El proveedor. La compra guarda el id; el nombre vive en `terceros`. */
  terceroId: string;
  numeroFactura: string;
  fecha: string;
  condicion: CondicionPago;
  subtotal: number;
  iva: number;
  /** Lo que la empresa le retuvo al proveedor. Se guarda calculada. */
  retefuente: number;
  /** `subtotal + iva − retefuente`: la retención se le paga al Estado, no a él. */
  total: number;
  saldoPendiente: number;
  asientoId: string;
  anulada: boolean;
  motivoAnulacion: string | null;
  observacion: string | null;
  creadoPorId: string;
  creadoEn: string;
  actualizadoEn: string;
  /** Presente solo en el detalle (`GET /compras/:id`). */
  detalles?: CompraDetalle[];
}

export interface LineaCompraPayload {
  productoId: string;
  cantidad: number;
  costoUnitario: number;
  porcentajeIva?: number;
}

export interface NuevaCompraPayload {
  terceroId: string;
  numeroFactura: string;
  fecha?: string;
  condicion?: CondicionPago;
  /** Si no viene, el backend calcula el 2,5 % sobre el subtotal. */
  retefuente?: number;
  observacion?: string;
  lineas: LineaCompraPayload[];
}

export interface FiltrosCompra extends FiltroPaginado {
  terceroId?: string;
  desde?: string;
  hasta?: string;
  soloPendientes?: boolean;
  incluirAnuladas?: boolean;
}

export const CONDICIONES_COMPRA: { id: CondicionPago; label: string }[] = [
  { id: "CONTADO", label: "Contado" },
  { id: "CREDITO", label: "Crédito" },
];

/** Las tres tarifas que admite el CHECK de la base. */
export const PORCENTAJES_IVA = [0, 5, 19] as const;

/** Tarifa de retención en la fuente por compras, la misma del backend. */
export const RETEFUENTE_COMPRAS_PCT = 2.5;

/** El estado de una compra se DERIVA: no hay columna que lo guarde. */
export type EstadoCompra = "ANULADA" | "PAGADA" | "PENDIENTE";

export function estadoDeCompra(compra: Compra): EstadoCompra {
  if (compra.anulada) return "ANULADA";
  return compra.saldoPendiente > 0 ? "PENDIENTE" : "PAGADA";
}

/**
 * Los cuatro montos, en centavos enteros.
 *
 * Es la misma aritmética del backend (`calcularTotales`), repetida acá para que
 * el formulario muestre el total antes de guardar. Se compara en centavos por
 * lo mismo que allá: en coma flotante 0.1 + 0.2 no da 0.3.
 *
 * La resta es la parte que se malinterpreta: la retención **no se le paga al
 * proveedor**, se le paga al Estado. Lo que se le debe a él ya viene descontado.
 */
export function calcularTotales(
  lineas: { cantidad?: number; costoUnitario?: number; porcentajeIva?: number }[],
  retefuenteExplicito?: number,
): { subtotal: number; iva: number; retefuente: number; total: number } {
  const cent = (n: number) => Math.round(n * 100);
  let subtotal = 0;
  let iva = 0;

  for (const linea of lineas) {
    const base = cent(Number(linea?.cantidad ?? 0) * Number(linea?.costoUnitario ?? 0));
    subtotal += base;
    iva += Math.round((base * Number(linea?.porcentajeIva ?? 0)) / 100);
  }

  // El explícito gana: sirve para cuadrar al peso con la factura del proveedor.
  const retefuente =
    retefuenteExplicito !== undefined && !Number.isNaN(retefuenteExplicito)
      ? cent(retefuenteExplicito)
      : Math.round((subtotal * RETEFUENTE_COMPRAS_PCT) / 100);

  return {
    subtotal: subtotal / 100,
    iva: iva / 100,
    retefuente: retefuente / 100,
    total: (subtotal + iva - retefuente) / 100,
  };
}
