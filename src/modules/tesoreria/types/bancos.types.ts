// Espejo de `/cuentas-bancarias`, `/cuentas-bancarias/:id/movimientos` y
// `/extractos`. Archivo propio, no mezclado con `tesoreria.types.ts` (que
// es de Caja) — mismo criterio que el backend separó
// `banco-movimiento.service.ts`/`extracto.service.ts` de los de Caja
// dentro del mismo módulo `tesoreria`.

export const TIPOS_CUENTA_BANCARIA = ["AHORROS", "CORRIENTE"] as const;
export type TipoCuentaBancaria = (typeof TIPOS_CUENTA_BANCARIA)[number];

export const NOMBRE_TIPO_CUENTA_BANCARIA: Record<TipoCuentaBancaria, string> = {
  AHORROS: "Ahorros",
  CORRIENTE: "Corriente",
};

export interface CuentaBancariaResumen {
  id: string;
  banco: string;
  numero_cuenta: string;
  tipo_cuenta: TipoCuentaBancaria;
  cuenta_id: string;
  activa: boolean;
  /** Cuánta plata hay hoy. Puede ser negativo: el banco admite sobregiro. */
  saldo: string;
  /** El día del último movimiento, o `null` si nunca se movió. */
  ultimo_movimiento: string | null;
}

export interface CrearCuentaBancariaInput {
  banco: string;
  numeroCuenta: string;
  tipoCuenta: TipoCuentaBancaria;
  cuentaId: string;
}

/**
 * El libro. `SALDO_INICIAL` solo por `saldoInicial`, nunca por
 * `registrar` — mismo criterio que Caja.
 */
export const TIPOS_MOVIMIENTO_BANCO_MANUAL = [
  "CONSIGNACION",
  "RETIRO",
  "TRANSFERENCIA_ENTRANTE",
  "TRANSFERENCIA_SALIENTE",
  "NOTA_DEBITO",
  "NOTA_CREDITO",
  "CHEQUE",
] as const;
export type TipoMovimientoBancoManual =
  (typeof TIPOS_MOVIMIENTO_BANCO_MANUAL)[number];

export type TipoMovimientoBanco = "SALDO_INICIAL" | TipoMovimientoBancoManual;

export const NOMBRE_MOVIMIENTO_BANCO: Record<TipoMovimientoBanco, string> = {
  SALDO_INICIAL: "Saldo inicial",
  CONSIGNACION: "Consignación",
  RETIRO: "Retiro",
  TRANSFERENCIA_ENTRANTE: "Transferencia entrante",
  TRANSFERENCIA_SALIENTE: "Transferencia saliente",
  NOTA_DEBITO: "Nota débito",
  NOTA_CREDITO: "Nota crédito",
  CHEQUE: "Cheque",
};

/** `CONSIGNACION`/`NOTA_CREDITO`/`TRANSFERENCIA_ENTRANTE` suman; el resto resta. Solo para pintar el signo en la UI. */
export const DIRECCION_MOVIMIENTO_BANCO: Record<
  TipoMovimientoBancoManual,
  "ENTRADA" | "SALIDA"
> = {
  CONSIGNACION: "ENTRADA",
  RETIRO: "SALIDA",
  TRANSFERENCIA_ENTRANTE: "ENTRADA",
  TRANSFERENCIA_SALIENTE: "SALIDA",
  NOTA_DEBITO: "SALIDA",
  NOTA_CREDITO: "ENTRADA",
  CHEQUE: "SALIDA",
};

export interface MovimientoBancoResumen {
  id: string;
  cuenta_bancaria_id: string;
  fecha: string;
  tipo: TipoMovimientoBanco;
  /** `numeric` de Postgres, serializado como texto. */
  valor: string;
  concepto: string;
  origen_tipo: "FACTURA_VENTA" | "COMPRA" | null;
  origen_id: string | null;
  tercero_id: string | null;
  /** El saldo DESPUÉS de este movimiento. Puede ser negativo — sobregiro. */
  saldo_valor: string;
  asiento_id: string | null;
  /** Si ya apareció del otro lado, en una línea de extracto. */
  conciliado: boolean;
}

export interface PaginaMovimientosBanco {
  datos: MovimientoBancoResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface CargaInicialBancoInput {
  fecha: string;
  valor: number;
  concepto: string;
}

export interface RegistrarMovimientoBancoInput {
  tipo: TipoMovimientoBancoManual;
  fecha: string;
  valor: number;
  concepto: string;
  contraCuentaId: string;
}

/** El cuadre diario no existe en Bancos: esto es la conciliación por extracto. */
export type EstadoExtracto = "ABIERTO" | "CONCILIADO";

export interface ExtractoResumen {
  id: string;
  cuenta_bancaria_id: string;
  fecha_desde: string;
  fecha_hasta: string;
  saldo_inicial_banco: string;
  saldo_final_banco: string;
  estado: EstadoExtracto;
  conciliado_en: string | null;
  conciliado_por: string | null;
}

export const TIPOS_LINEA_EXTRACTO = ["DEBITO", "CREDITO"] as const;
export type TipoLineaExtracto = (typeof TIPOS_LINEA_EXTRACTO)[number];

export interface LineaExtractoResumen {
  id: string;
  extracto_id: string;
  fecha: string;
  descripcion: string;
  valor: string;
  tipo: TipoLineaExtracto;
  /** El movimiento del libro con el que ya se apareó, o `null` si sigue suelta. */
  banco_movimiento_id: string | null;
}

export interface ExtractoDetalle extends ExtractoResumen {
  lineas: LineaExtractoResumen[];
}

export interface PaginaExtractos {
  datos: ExtractoResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface CrearExtractoInput {
  fechaDesde: string;
  fechaHasta: string;
  saldoInicialBanco: number;
  saldoFinalBanco: number;
}

export interface AgregarLineaExtractoInput {
  fecha: string;
  descripcion: string;
  valor: number;
  tipo: TipoLineaExtracto;
}

export interface ConciliarManualInput {
  lineaId: string;
  movimientoId: string;
}

export interface ResumenConciliacionAutomatica {
  pares: number;
  lineasSinAparear: number;
  movimientosSinAparear: number;
}

/**
 * El corte de un día de una cuenta bancaria, congelado al cerrar. No bloquea
 * el libro: `cambios_posteriores` cuenta lo que entró después con fecha de ese
 * día o de uno anterior.
 */
export interface CorteBancoResumen {
  id: string;
  cuenta_bancaria_id: string;
  fecha: string;
  saldo_anterior: string;
  entradas: string;
  salidas: string;
  saldo_final: string;
  movimientos: number;
  /** Lo que mostraba el portal del banco, si alguien lo leyó. */
  saldo_banco: string | null;
  /** Banco menos libro. */
  diferencia: string | null;
  nota: string | null;
  cerrado_en: string;
  cerrado_por: string;
  cambios_posteriores: number;
}

export interface PaginaCortesBanco {
  datos: CorteBancoResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

/** El día como está hoy en el libro. Los números llegan como `number`, calculados. */
export interface PrevioCorteBanco {
  fecha: string;
  saldo_anterior: number;
  entradas: number;
  salidas: number;
  saldo_final: number;
  movimientos: MovimientoBancoResumen[];
  corte: CorteBancoResumen | null;
}

export interface CerrarCorteBancoInput {
  fecha: string;
  saldoBanco?: number;
  nota?: string;
}
