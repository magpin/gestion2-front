/**
 * Los anticipos de todos los clientes o de todos los proveedores (PC19), como
 * los devuelven `/cartera/anticipos` y `/pagos/anticipos`.
 */

export interface AnticipoDeCliente {
  movimientoId: string;
  terceroId: string;
  tercero: string;
  identificacion: string;
  /** «RC-000229». */
  recibo: string | null;
  fecha: string;
  detalle: string;
  recibido: number;
  aplicado: number;
  devuelto: number;
  porAplicar: number;
  facturasPendientes: number;
}

export interface AnticipoAProveedor {
  movimientoId: string;
  terceroId: string;
  tercero: string;
  identificacion: string;
  /** «EG-000068». */
  comprobante: string | null;
  comprobanteId: string | null;
  fecha: string;
  detalle: string;
  anticipo: number;
  retenido: number;
  cruzado: number;
  devuelto: number;
  porLegalizar: number;
  comprasPendientes: number;
  /** La primera compra por pagar: «Llegó la factura FC-771». */
  primeraCompra: string | null;
}

export interface DevolucionAnticipo {
  id: string;
  anticipoId: string;
  tercero: string;
  fecha: string;
  valor: number;
  destino: string;
}

export interface AnticiposDeClientes {
  total: number;
  clientes: number;
  anticipos: AnticipoDeCliente[];
  devoluciones: DevolucionAnticipo[];
}

export interface AnticiposAProveedores {
  total: number;
  proveedores: number;
  anticipos: AnticipoAProveedor[];
  devoluciones: DevolucionAnticipo[];
}

export interface DatosDevolucion {
  medio: "CAJA" | "BANCO";
  cajaId?: string;
  cuentaBancariaId?: string;
  fecha: string;
  valor: number;
  motivo: string;
}

/** Lo que le quedó a favor a un cliente por una nota crédito sobre una factura pagada (E1). */
export interface SaldoAFavorDeCliente {
  facturaId: string;
  factura: string;
  nota: string | null;
  terceroId: string;
  tercero: string;
  fecha: string;
  saldo: number;
  facturasPendientes: number;
}

export interface SaldosAFavor {
  total: number;
  clientes: number;
  saldos: SaldoAFavorDeCliente[];
}
