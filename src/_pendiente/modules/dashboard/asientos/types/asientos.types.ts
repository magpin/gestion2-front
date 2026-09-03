import type { FiltroPaginado } from "@/core/types/pagination.types";

// Espejo de `asiento` y `asiento_detalle` (backend/src/modules/contabilidad).
//
// Los `numeric` de Postgres llegan como string por el driver: todo lo que sea
// plata se pasa por `Number()` antes de mostrarse.

/** Lo que puede aparecer en cualquier columna `origen_tipo` del esquema. */
export type OrigenTipo =
  | "COMPRA"
  | "VENTA"
  | "OT"
  | "ANTICIPO_OT"
  | "ABONO"
  | "ARQUEO"
  | "AJUSTE_INV"
  | "NOTA_CREDITO"
  | "CIERRE";

/** La cuenta del PUC, como viene en la relación del detalle. */
export interface CuentaDelDetalle {
  id: string;
  codigo: string;
  nombre: string;
}

export interface AsientoDetalle {
  id: string;
  asientoId: string;
  empresaId: string;
  cuentaId: string;
  /** Presente solo en el detalle: `GET /contabilidad/asientos/:id` la trae. */
  cuenta?: CuentaDelDetalle;
  esImputable: boolean;
  terceroId: string | null;
  debito: number;
  credito: number;
  detalle: string | null;
}

/**
 * La columna vertebral: doce de los diecinueve eventos terminan acá.
 *
 * Es el único bloque donde una fila mal escrita no se corrige — se reversa con
 * un asiento espejo que apunta al original por `reversaDeId`. Por eso no hay
 * edición ni la habrá, y por eso tampoco hay endpoint para crear uno a mano:
 * los asientos nacen dentro de la transacción del documento que los produce.
 */
export interface Asiento {
  id: string;
  empresaId: string;
  /** `bigint` en la base: llega como string y se muestra tal cual. */
  numero: string;
  /** `date`, no `timestamptz`: un asiento pertenece a un día, y de ahí sale el período. */
  fecha: string;
  origenTipo: OrigenTipo;
  origenId: string | null;
  totalDebito: number;
  totalCredito: number;
  descripcion: string | null;
  anulado: boolean;
  /** Si tiene valor, este asiento es el espejo que reversó a otro. */
  reversaDeId: string | null;
  creadoPorId: string;
  creadoEn: string;
  /** Presente solo en el detalle (`GET /contabilidad/asientos/:id`). */
  detalles?: AsientoDetalle[];
}

export interface FiltrosAsiento extends FiltroPaginado {
  desde?: string;
  hasta?: string;
  origenTipo?: OrigenTipo;
  incluirAnulados?: boolean;
}

/** Qué evento produjo el asiento. Son los `origen_tipo` que admite el esquema. */
export const ORIGEN_LABEL: Record<string, string> = {
  COMPRA: "Compra",
  VENTA: "Venta",
  OT: "Orden de trabajo",
  ANTICIPO_OT: "Anticipo de OT",
  ABONO: "Cobro o pago",
  ARQUEO: "Arqueo de caja",
  AJUSTE_INV: "Ajuste de inventario",
  NOTA_CREDITO: "Nota crédito",
  CIERRE: "Cierre de período",
};

/** El estado se DERIVA: la única columna es `anulado`. */
export function estadoDeAsiento(asiento: Asiento): "ANULADO" | "VIGENTE" {
  return asiento.anulado ? "ANULADO" : "VIGENTE";
}

/**
 * A qué pantalla lleva el documento que produjo el asiento.
 *
 * `null` cuando ese origen no tiene ruta propia por id: los cobros, los arqueos
 * y las notas crédito viven dentro de una pestaña. Devolver `null` en vez de
 * una ruta inventada es lo que permite esconder la acción en vez de ofrecer un
 * enlace roto.
 */
export function rutaDelOrigen(asiento: Asiento): string | null {
  if (!asiento.origenId) return null;
  switch (asiento.origenTipo) {
    case "VENTA":
      return `/dashboard/ventas/${asiento.origenId}`;
    case "COMPRA":
      return `/dashboard/compras/${asiento.origenId}`;
    default:
      return null;
  }
}
