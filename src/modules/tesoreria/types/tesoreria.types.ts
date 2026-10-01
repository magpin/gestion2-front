import type { ConfiguracionCuentas } from "@/modules/plan-cuentas/types/cuentas-automaticas.types";

// Espejo de `/cajas`, `/cajas/:id/movimientos`, `/cajas/:id/arqueos` e
// `/tesoreria/configuracion` del backend (módulo `tesoreria`, Caja y
// Bancos — hoy solo Caja).

/** PRINCIPAL vive en una sede (arqueo por punto de venta); MENOR es el fondo fijo de toda la empresa. */
export const TIPOS_CAJA = ["PRINCIPAL", "MENOR"] as const;
export type TipoCaja = (typeof TIPOS_CAJA)[number];

export const NOMBRE_TIPO_CAJA: Record<TipoCaja, string> = {
  PRINCIPAL: "Principal",
  MENOR: "Caja menor",
};

/** Un tercero, con lo justo para mostrarlo y dejarlo elegido en un selector. */
export interface ResponsableCaja {
  id: string;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
}

/** El maestro. Sin paginar: una empresa tiene pocas cajas. */
export interface CajaResumen {
  id: string;
  nombre: string;
  tipo: TipoCaja;
  sede_id: string | null;
  cuenta_id: string;
  activa: boolean;
  /** El empleado que responde por la caja: a quién se le cobra un faltante. */
  responsable: ResponsableCaja | null;
  /** Cuánta plata hay adentro hoy. Lo calcula la API sobre el último movimiento. */
  saldo: string;
  /** El día del último movimiento, o `null` si la caja nunca se movió. */
  ultimo_movimiento: string | null;
}

/**
 * Cuánto entró y cuánto salió en un libro **entero**, no en la página que se
 * está mirando. El saldo inicial va aparte: no es plata que entró, es de dónde
 * arrancó la cuenta.
 */
export interface ResumenLibro {
  entradas: string;
  salidas: string;
  saldo_inicial: string;
  saldo: string;
}

export interface CrearCajaInput {
  nombre: string;
  tipo: TipoCaja;
  /** Obligatoria para PRINCIPAL, ausente para MENOR — lo exige `ck_caja_sede` en el backend. */
  sedeId?: string;
  cuentaId: string;
  responsableTerceroId?: string;
}

export interface EditarCajaInput {
  nombre?: string;
  /** `null` quita el responsable; sin el campo, no se toca. */
  responsableTerceroId?: string | null;
}

/** El libro. `tipo` de la fila, no el de la caja. */
export type TipoMovimientoCaja = "SALDO_INICIAL" | "INGRESO" | "EGRESO";

export const NOMBRE_MOVIMIENTO_CAJA: Record<TipoMovimientoCaja, string> = {
  SALDO_INICIAL: "Saldo inicial",
  INGRESO: "Ingreso",
  EGRESO: "Egreso",
};

export interface MovimientoCajaResumen {
  id: string;
  caja_id: string;
  fecha: string;
  tipo: TipoMovimientoCaja;
  /** `numeric` de Postgres, serializado como texto. */
  valor: string;
  concepto: string;
  /** `FACTURA_VENTA`/`COMPRA` si vino de un cobro/pago; `null` en un movimiento manual. */
  origen_tipo: "FACTURA_VENTA" | "COMPRA" | null;
  origen_id: string | null;
  tercero_id: string | null;
  /** El saldo DESPUÉS de este movimiento. Congelado, no derivado. */
  saldo_valor: string;
  /** `null` solo en `SALDO_INICIAL`: esa carga no genera asiento. */
  asiento_id: string | null;
  /** El movimiento que este corrige, si es una reversa. */
  reversa_de: string | null;
  motivo_reversa: string | null;
  /** La reversa que corrigió a este, si ya la tiene. */
  reversado_por: string | null;
  /** El ajuste de un arqueo no se reversa: se corrige con otro arqueo. */
  es_ajuste_arqueo: boolean;
}

export interface PaginaMovimientosCaja {
  datos: MovimientoCajaResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface CargaInicialCajaInput {
  fecha: string;
  valor: number;
  concepto: string;
}

/** La otra pata del asiento (`contraCuentaId`) la elige quien registra el movimiento. */
export interface IngresoCajaInput {
  fecha: string;
  valor: number;
  concepto: string;
  contraCuentaId: string;
}

export type EgresoCajaInput = IngresoCajaInput;

/** El cuadre diario. `saldo_contado`/`diferencia`/`cerrado_*` quedan `null` mientras sigue `ABIERTO`. */
export type EstadoArqueo = "ABIERTO" | "CERRADO";

export interface ArqueoResumen {
  id: string;
  caja_id: string;
  fecha: string;
  saldo_sistema: string;
  saldo_contado: string | null;
  /** Positiva es sobrante, negativa es faltante — mismo signo que el backend. */
  diferencia: string | null;
  estado: EstadoArqueo;
  cerrado_en: string | null;
  cerrado_por: string | null;
  nota: string | null;
  asiento_ajuste_id: string | null;
  /** Solo con faltante: lo asumió la empresa o se le cobró al responsable. */
  tratamiento_faltante: TratamientoFaltante | null;
  responsable_tercero_id: string | null;
  /** El conteo billete por billete; vacío si se cerró con el total a secas. */
  denominaciones: DenominacionContada[];
}

export interface DenominacionContada {
  tipo: "BILLETE" | "MONEDA";
  denominacion: string;
  cantidad: number;
  subtotal: string;
}

export interface PaginaArqueos {
  datos: ArqueoResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface AbrirArqueoInput {
  fecha: string;
  nota?: string;
}

/**
 * Lo contado: el total, el conteo billete por billete, o los dos —y entonces
 * tienen que coincidir—. Las cantidades en cero no hace falta mandarlas.
 */
export interface CerrarArqueoInput {
  saldoContado?: number;
  denominaciones?: { tipo: "BILLETE" | "MONEDA"; denominacion: number; cantidad: number }[];
  nota?: string;
  /** Solo con faltante, y ahí es obligatorio. */
  tratamientoFaltante?: TratamientoFaltante;
  /** A quién se le cobra, si no es el responsable de la caja. */
  responsableTerceroId?: string;
}

/** Un faltante lo asume la empresa (gasto) o lo paga quien respondía por la caja. */
export type TratamientoFaltante = "EMPRESA" | "RESPONSABLE";

/** Reversar un ingreso o egreso manual: la fecha de la corrección y su porqué. */
export interface ReversarMovimientoCajaInput {
  fecha: string;
  motivo: string;
}

/** Los tres destinos de una diferencia de arqueo. */
export type ConceptoArqueo = "SOBRANTE" | "FALTANTE_COBRABLE" | "FALTANTE_ASUMIDO";

/** Las cuentas automáticas de caja. Se muestran en Plan de cuentas → Cuentas automáticas. */
export type CajaConfiguracion = ConfiguracionCuentas<ConceptoArqueo>;

/** Lo que dejó hecho `preparar`. */
export interface ResultadoPreparar {
  cuentasCreadas: string[];
  cajasCreadas: string[];
  /** Las cajas de más, sin movimientos, que se desactivaron: se maneja una sola. */
  cajasDesactivadas?: string[];
  /** Lo que no se pudo dejar listo, en palabras. */
  avisos?: string[];
}

/**
 * Un renglón de un cobro o de un pago: de dónde sale o entra la plata, y
 * cuánta. Vive acá y no en `ventas`/`compras` porque el medio de pago es
 * asunto de Tesorería: las dos lo usan, y el editor que los arma también.
 */
export type MedioPagoInput = { valor: number } & (
  | { medio: "CAJA"; cajaId: string }
  | { medio: "BANCO"; cuentaBancariaId: string }
);

/**
 * Un medio al emitir una factura o registrar una compra de contado. El valor
 * puede faltar: el backend le asigna lo que quede por cobrar o pagar, porque
 * el total exacto —IVA, retenciones— lo calcula el servidor.
 */
export type MedioAlEmitirInput = { valor?: number } & (
  | { medio: "CAJA"; cajaId: string }
  | { medio: "BANCO"; cuentaBancariaId: string }
);
