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
  archivo_nombre: string | null;
}

export const TIPOS_LINEA_EXTRACTO = ["DEBITO", "CREDITO"] as const;
export type TipoLineaExtracto = (typeof TIPOS_LINEA_EXTRACTO)[number];

export interface LineaExtractoResumen {
  id: string;
  extracto_id: string;
  fecha: string;
  descripcion: string;
  referencia: string | null;
  valor: string;
  tipo: TipoLineaExtracto;
  origen: "MANUAL" | "IMPORTADA";
  fila_archivo: number | null;
  /** Error del banco: por qué esta línea no se cruza. */
  nota: string | null;
  /** El cruce vigente en que está, o `null` si sigue suelta. */
  grupo_id: string | null;
}

/**
 * Por qué se cruzó. Los tres primeros los propone el sistema; `MANUAL` lo
 * eligió una persona, `REGISTRADA` nació de registrar lo que el banco cobró
 * solo, y `ANTERIOR` viene de una conciliación previa.
 */
export type CriterioGrupo =
  | "REFERENCIA"
  | "MISMA_FECHA"
  | "FECHA_CERCANA"
  | "MANUAL"
  | "REGISTRADA"
  | "ANTERIOR";

/**
 * Un cruce. No es «una línea con un movimiento»: son unas líneas del extracto
 * con unos movimientos del libro cuyas sumas con signo son iguales. Un renglón
 * del banco puede corresponder a dos hechos del libro, o al revés.
 */
export interface GrupoResumen {
  id: string;
  criterio: CriterioGrupo;
  creado_en: string;
  creado_por: string | null;
  linea_ids: string[];
  movimiento_ids: string[];
}

export interface ExtractoDetalle extends ExtractoResumen {
  lineas: LineaExtractoResumen[];
  grupos: GrupoResumen[];
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

/** El criterio que puede mandar el frontend al confirmar: no `REGISTRADA` ni `ANTERIOR`. */
export type CriterioConciliacion =
  | "REFERENCIA"
  | "MISMA_FECHA"
  | "FECHA_CERCANA"
  | "MANUAL";

export interface GrupoConciliacionInput {
  lineaIds: string[];
  movimientoIds: string[];
  criterio: CriterioConciliacion;
}

/** Uno o varios cruces, todos o ninguno. */
export interface ConciliarInput {
  grupos: GrupoConciliacionInput[];
}

/**
 * Lo que el sistema propone, calculado en el momento. No escribe nada: hasta
 * que una persona no confirme, acá no pasó nada.
 */
export interface PropuestasExtracto {
  propuestas: Array<{
    lineaId: string;
    movimientoId: string;
    criterio: "REFERENCIA" | "MISMA_FECHA" | "FECHA_CERCANA";
    /** Días del banco respecto al libro: positivo si el banco lo registró después. */
    dias: number;
    /** El número que coincidió, si el criterio es `REFERENCIA`. */
    referencia: string | null;
    motivo: string;
  }>;
  /** Líneas con más de un candidato igual de bueno: elige una persona. */
  ambiguas: Array<{ lineaId: string; candidatos: string[] }>;
  /** Líneas sueltas que reconoce una regla: «Registrar las 23 líneas de 4×1000». */
  porRegla: Array<{
    reglaId: string;
    nombre: string;
    contraCuentaId: string;
    concepto: string;
    lineaIds: string[];
    total: string;
  }>;
  lineasSueltas: string[];
  movimientosSueltos: string[];
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
