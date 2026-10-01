/** Lo que devuelve `/estados-financieros`. Espejo de `estados.reglas.ts` y del servicio del backend. */

export interface CuentaValor {
  codigo: string;
  nombre: string;
  valor: number;
}

export interface Periodo {
  mes: string;
  desde: string;
  hasta: string;
  /** El día al que se toma el balance: el último del mes, o hoy si el mes va en curso. */
  corte: string;
  estado: "ABIERTO" | "CERRADO" | "SIN_PERIODO";
  asientos: number;
}

// ─── Estado de resultados ───────────────────────────────────────────────────

export interface Renglon {
  clave: string;
  etiqueta: string;
  valor: number;
  tipo: "grupo" | "subtotal" | "total";
  /** El detalle por cuenta, de mayor a menor. Solo en los grupos. */
  cuentas?: CuentaValor[];
}

export interface EstadoResultados {
  renglones: Renglon[];
  ingresosOperacionales: number;
  utilidadBruta: number;
  utilidadOperacional: number;
  utilidadAntesDeImpuestos: number;
  utilidadNeta: number;
}

export interface Resultados {
  periodo: Periodo;
  actual: EstadoResultados;
  comparado: { periodo: Periodo; estado: EstadoResultados } | null;
  /** En porcentaje con un decimal; `null` si no hubo ingresos. */
  margenes: {
    bruto: number | null;
    operacional: number | null;
    antesDeImpuestos: number | null;
  };
  /** La utilidad antes de impuestos de los últimos seis meses, hasta el elegido. */
  porMes: Array<{ mes: string; utilidad: number }>;
}

// ─── Balance general ────────────────────────────────────────────────────────

export interface RenglonBalance {
  /** El grupo del PUC («11»), o «36*» y «37*» para los resultados sin cerrar. */
  grupo: string;
  etiqueta: string;
  valor: number;
  cuentas: CuentaValor[];
}

export interface SeccionBalance {
  etiqueta: string;
  total: number;
  renglones: RenglonBalance[];
}

export interface LadoBalance {
  total: number;
  secciones: SeccionBalance[];
}

export interface BalanceGeneral {
  activo: LadoBalance;
  pasivo: LadoBalance;
  patrimonio: LadoBalance;
  /** Activo menos pasivo y patrimonio: cero si el libro cuadra. */
  diferencia: number;
}

export interface Balance {
  periodo: Periodo;
  actual: BalanceGeneral;
  comparado: { periodo: Periodo; balance: BalanceGeneral } | null;
}

// ─── Flujo de caja ──────────────────────────────────────────────────────────

export type Actividad = "OPERACION" | "INVERSION" | "FINANCIACION";

export interface ActividadFlujo {
  actividad: Actividad;
  etiqueta: string;
  entradas: number;
  salidas: number;
  neto: number;
  rubros: Array<{ rubro: string; valor: number }>;
}

export interface FlujoDirecto {
  saldoInicial: number;
  actividades: ActividadFlujo[];
  neto: number;
  saldoFinal: number;
  /** Lo que no se pudo explicar. Cero si cuadra. */
  diferencia: number;
}

export interface Flujo {
  periodo: Periodo;
  directo: FlujoDirecto;
}

export interface SemanaProyectada {
  /** Lunes de la semana, o `null` para lo ya vencido. */
  desde: string | null;
  hasta: string | null;
  etiqueta: string;
  entradas: number;
  salidas: number;
  /** Con lo que quedaría la empresa al final de esa semana. */
  saldo: number;
}

export interface Proyectado {
  hoy: string;
  disponible: number;
  semanas: SemanaProyectada[];
}

// ─── Descarga ───────────────────────────────────────────────────────────────

export type TipoEstado = "RESULTADOS" | "BALANCE" | "FLUJO";
export type FormatoEstado = "PDF" | "XLSX";
