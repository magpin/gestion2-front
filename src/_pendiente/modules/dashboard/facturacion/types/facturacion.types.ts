import type { FiltroPaginado } from "@/core/types/pagination.types";

// Espejo de `factura`, `nota_credito` y `nota_credito_detalle`
// (backend/src/modules/facturacion).
//
// Los `numeric` de Postgres llegan como string por el driver: todo lo que sea
// plata se pasa por `Number()` antes de mostrarse.

export type OrigenFacturableTipo = "VENTA" | "OT";

/**
 * La identidad fiscal, y nada más.
 *
 * No guarda `subtotal`, `iva` ni `total`: se leen del origen al imprimir. Eso
 * es seguro únicamente porque emitir **congela** el origen — sin esa regla, el
 * impreso se contradiría con el papel ya entregado al cliente.
 */
export interface Factura {
  id: string;
  empresaId: string;
  terceroId: string;
  prefijo: string;
  consecutivo: string;
  /** `prefijo || consecutivo`. Lo que ve el cliente. */
  numero: string;
  origenTipo: OrigenFacturableTipo;
  /** Único: un documento no se factura dos veces. */
  origenId: string;
  fechaEmision: string;
  /** La marca una nota crédito de alcance TOTAL. Nunca se borra. */
  anulada: boolean;
  emitidaPorId: string;
  creadoEn: string;
}

/** Un renglón tal como sale impreso. Lo compone el backend leyendo el origen. */
export interface RenglonImpreso {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  porcentajeIva: number;
  subtotal: number;
  productoId?: string | null;
  /** El costo con el que salió. Lo necesita la nota crédito para devolver al kardex. */
  costoUnitario?: number;
}

/**
 * El impreso, compuesto al leer: encabezado de la factura y renglones del
 * origen. La factura no guarda montos, así que este es el único sitio donde
 * están.
 */
export interface FacturaImpresa {
  numero: string;
  fechaEmision: string;
  anulada: boolean;
  terceroId: string;
  origen: { tipo: OrigenFacturableTipo; id: string };
  subtotal: number;
  iva: number;
  total: number;
  renglones: RenglonImpreso[];
}

export type MotivoNotaCredito = "DEVOLUCION" | "ANULACION" | "DESCUENTO" | "CORRECCION";

/** TOTAL anula la factura y libera el origen; PARCIAL no la toca. */
export type AlcanceNotaCredito = "TOTAL" | "PARCIAL";

export interface NotaCreditoDetalle {
  id: string;
  notaCreditoId: string;
  empresaId: string;
  /** NULL si la línea es un servicio de OT, que no tiene producto. */
  productoId: string | null;
  descripcion: string | null;
  cantidad: number;
  precioUnitario: number;
  /** Copiado de la línea ORIGINAL, no del promedio de hoy. */
  costoUnitario: number;
  porcentajeIva: number;
  subtotal: number;
}

/**
 * La segunda mitad de la inmutabilidad.
 *
 * Como la factura congela el origen, corregir deja de ser editar: es emitir
 * este documento. A diferencia de la factura, **sí guarda montos y renglones**:
 * no tiene documento del cual leerlos — ella es el origen.
 */
export interface NotaCredito {
  id: string;
  empresaId: string;
  terceroId: string;
  facturaId: string;
  prefijo: string;
  consecutivo: string;
  numero: string;
  fechaEmision: string;
  motivo: MotivoNotaCredito;
  alcance: AlcanceNotaCredito;
  subtotal: number;
  iva: number;
  total: number;
  observacion: string | null;
  asientoId: string;
  emitidaPorId: string;
  creadoEn: string;
  /** Presente solo en el detalle (`GET /notas-credito/:id`). */
  detalles?: NotaCreditoDetalle[];
}

export interface EmitirFacturaPayload {
  origenTipo: OrigenFacturableTipo;
  origenId: string;
}

export interface LineaNotaCreditoPayload {
  productoId?: string;
  descripcion?: string;
  cantidad: number;
  precioUnitario: number;
  /** Sin él la mercancía vuelve al kardex sin costo. Viene del impreso. */
  costoUnitario?: number;
  porcentajeIva?: number;
}

export interface NuevaNotaCreditoPayload {
  facturaId: string;
  motivo: MotivoNotaCredito;
  alcance: AlcanceNotaCredito;
  fecha?: string;
  observacion?: string;
  lineas: LineaNotaCreditoPayload[];
}

export interface FiltrosFactura extends FiltroPaginado {
  terceroId?: string;
  origenTipo?: OrigenFacturableTipo;
  desde?: string;
  hasta?: string;
  incluirAnuladas?: boolean;
}

export interface FiltrosNotaCredito extends FiltroPaginado {
  facturaId?: string;
  desde?: string;
  hasta?: string;
}

export const MOTIVOS_NOTA: { id: MotivoNotaCredito; label: string; ayuda: string }[] = [
  {
    id: "DEVOLUCION",
    label: "Devolución",
    ayuda: "El cliente trajo la mercancía de vuelta. Reingresa al kardex.",
  },
  {
    id: "ANULACION",
    label: "Anulación",
    ayuda: "La factura no debió emitirse. Con alcance TOTAL libera el origen.",
  },
  {
    id: "DESCUENTO",
    label: "Descuento",
    ayuda: "Se le rebaja al cliente sin que vuelva mercancía.",
  },
  {
    id: "CORRECCION",
    label: "Corrección",
    ayuda: "El papel salió con un dato equivocado.",
  },
];

export const ALCANCES_NOTA: { id: AlcanceNotaCredito; label: string; ayuda: string }[] = [
  {
    id: "PARCIAL",
    label: "Parcial",
    ayuda: "Devuelve algunos renglones. La factura sigue viva.",
  },
  {
    id: "TOTAL",
    label: "Total",
    ayuda: "Anula la factura y libera el documento de origen, que vuelve a editarse.",
  },
];

/** El estado de una factura se DERIVA: la única columna es `anulada`. */
export function estadoDeFactura(factura: Factura): "ANULADA" | "EMITIDA" {
  return factura.anulada ? "ANULADA" : "EMITIDA";
}

/**
 * Los montos de una nota crédito, en centavos enteros.
 *
 * Es la misma función del backend (`calcularMontosNota`), repetida para que el
 * formulario muestre el total antes de guardar. El costo NO entra en el total:
 * va al asiento del inventario, no a lo que se le devuelve al cliente.
 */
export function calcularMontosNota(
  lineas: { cantidad?: number; precioUnitario?: number; porcentajeIva?: number }[],
): { subtotal: number; iva: number; total: number } {
  const cent = (n: number) => Math.round(n * 100);
  let subtotal = 0;
  let iva = 0;

  for (const linea of lineas) {
    const base = cent(Number(linea?.cantidad ?? 0) * Number(linea?.precioUnitario ?? 0));
    subtotal += base;
    iva += Math.round((base * Number(linea?.porcentajeIva ?? 0)) / 100);
  }

  return { subtotal: subtotal / 100, iva: iva / 100, total: (subtotal + iva) / 100 };
}
