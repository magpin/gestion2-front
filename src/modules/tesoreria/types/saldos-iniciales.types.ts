export type OrigenSaldos = "SOCIOS" | "ANTES";

/** GET /tesoreria/saldos-iniciales: qué cajas y cuentas pueden arrancar. */
export interface EstadoSaldosIniciales {
  /** Hay alguna caja o cuenta activa que nunca se movió. */
  pendiente: boolean;
  cajas: Array<{ id: string; nombre: string; tipo: "PRINCIPAL" | "MENOR"; sinMovimientos: boolean }>;
  cuentas: Array<{ id: string; nombre: string; tipoCuenta: string; sinMovimientos: boolean }>;
  contrapartidas: Record<OrigenSaldos, { codigo: string; nombre: string } | null>;
}

export interface CargarSaldosInicialesInput {
  fecha: string;
  origen: OrigenSaldos;
  cajas: Array<{ cajaId: string; valor: number }>;
  cuentas: Array<{ cuentaBancariaId: string; valor: number }>;
}
