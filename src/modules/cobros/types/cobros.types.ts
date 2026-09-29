/** Espejo de `ReciboCajaService` en el backend (`ventas`). */

export type EdadCartera = "POR_VENCER" | "D1_30" | "D31_60" | "D61_90" | "D90_MAS";

export const EDADES: EdadCartera[] = ["POR_VENCER", "D1_30", "D31_60", "D61_90", "D90_MAS"];

export const NOMBRE_EDAD: Record<EdadCartera, { titulo: string; detalle: string }> = {
  POR_VENCER: { titulo: "Por vencer", detalle: "Al día" },
  D1_30: { titulo: "1 a 30 días", detalle: "Vencido" },
  D31_60: { titulo: "31 a 60 días", detalle: "Vencido" },
  D61_90: { titulo: "61 a 90 días", detalle: "Vencido" },
  D90_MAS: { titulo: "Más de 90", detalle: "Vencido" },
};

export interface ClientePorCobrar {
  terceroId: string;
  nombre: string;
  identificacion: string;
  facturas: number;
  porVencer: number;
  vencido: number;
  total: number;
  maxDiasVencidos: number;
}

export interface Cartera {
  hoy: string;
  total: number;
  facturas: number;
  edades: Record<EdadCartera, number>;
  clientes: ClientePorCobrar[];
}

export interface FacturaPorCobrar {
  id: string;
  numero: string;
  fecha: string;
  vence: string | null;
  venceEfectivo: string;
  diasVencidos: number;
  edad: EdadCartera;
  pendiente: number;
}

export interface ReciboCaja {
  id: string;
  numero: string;
  fecha: string;
  terceroId: string;
  terceroNombre: string;
  medio: "CAJA" | "BANCO";
  cajaId: string | null;
  cuentaBancariaId: string | null;
  destino: string;
  /** Lo que pagó el cliente en plata: abonos más anticipo. */
  total: number;
  /** Lo que se quedó el datáfono; entró `total − comision`. */
  comision: number;
  anticipo: number;
  estado: "VIGENTE" | "ANULADO";
  motivoAnulacion: string | null;
  aplicaciones: Array<{ facturaId: string; factura: string; valor: number; descuento: number }>;
}

export interface CrearReciboCajaInput {
  terceroId: string;
  fecha: string;
  medio: "CAJA" | "BANCO";
  cajaId?: string;
  cuentaBancariaId?: string;
  aplicaciones: Array<{ facturaId: string; valor: number; descuento?: number }>;
  anticipo?: number;
  comision?: number;
}

/** Un anticipo del cliente con lo que le queda por aplicar. */
export interface AnticipoCliente {
  movimientoId: string;
  fecha: string;
  detalle: string;
  valor: number;
  aplicado: number;
  saldo: number;
}

/** Una factura del cliente con plata a su favor (una nota crédito después de cobrada). */
export interface SaldoAFavor {
  facturaId: string;
  factura: string;
  saldo: number;
}

export interface CruceCartera {
  id: string;
  tipo: "ANTICIPO" | "SALDO_A_FAVOR";
  terceroId: string;
  terceroNombre: string;
  origen: string;
  destinoFacturaId: string;
  destino: string;
  valor: number;
  fecha: string;
  estado: "VIGENTE" | "ANULADO";
  motivoAnulacion: string | null;
}

export interface CrearCruceInput {
  tipo: "ANTICIPO" | "SALDO_A_FAVOR";
  origenId: string;
  destinoFacturaId: string;
  valor: number;
  fecha: string;
}
