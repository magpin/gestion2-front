/** Lo que devuelve `/impuestos`. Espejo de `impuestos.service.ts` del backend. */

export type Obligacion = "RETENCION" | "IVA" | "RETEICA" | "ICA" | "RENTA";
export type PeriodicidadIva = "BIMESTRAL" | "CUATRIMESTRAL";
export type EstadoObligacion = "CAUSANDOSE" | "POR_PRESENTAR" | "PRESENTADA" | "PAGADA";

export interface Declaracion {
  id: string;
  obligacion: Obligacion;
  periodo: string;
  municipioCodigo: string | null;
  estado: "PRESENTADA" | "PAGADA";
  numeroFormulario: string;
  presentadaEl: string;
  valorAPagar: number;
  vence: string | null;
  archivoNombre: string | null;
  tieneArchivo: boolean;
  recibo490: string | null;
  pagadaEl: string | null;
  intereses: number;
  gmf: number;
  asientoId: string | null;
  /** Renta: el impuesto neto del 110. */
  impuestoNeto: number | null;
  /** Renta: el anticipo que se liquidó para el año siguiente. */
  anticipoSiguiente: number | null;
  /** En cuántas cuotas se paga: 1, salvo la renta. */
  cuotas: number;
  pagado: number;
  cuotasPagadas: number;
}

export interface FilaCalendario {
  obligacion: Obligacion;
  periodo: string;
  municipio: { codigo: string; nombre: string } | null;
  etiqueta: string;
  formulario: string | null;
  /** `null`: el calendario de ley no tiene la fecha. */
  vence: string | null;
  situacion: { estado: EstadoObligacion; dias: number | null; vencida: boolean };
  valor: number | null;
  declaracion: Declaracion | null;
}

export interface ConfiguracionImpuestos {
  nit: string;
  digito: number;
  periodicidadIva: PeriodicidadIva | null;
  declaraRetencion: boolean;
  responsableIva: boolean;
  reteica: Array<{ codigo: string; nombre: string; periodicidad: string }>;
  /** Los municipios con sede: en cada uno se declara ICA. */
  ica: Array<{ codigo: string; nombre: string; principal: boolean; desdeAnio: number | null }>;
  declaraRenta: boolean;
  regimenSimple: boolean;
  tipoPersona: "JURIDICA" | "NATURAL";
  granContribuyente: boolean;
  zomacTamano: ZomacTamano | null;
  desdeAnioRenta: number | null;
}

export type ZomacTamano = "MICRO" | "PEQUENA" | "MEDIANA" | "GRANDE";

export interface Calendario {
  hoy: string;
  anio: number;
  configuracion: ConfiguracionImpuestos;
  filas: FilaCalendario[];
  porPagar: number;
  proxima: FilaCalendario | null;
}

// El 350 tal como lo arma `reportes` (Formulario350).
export interface Cifra350 {
  base: string;
  valor: string;
  baseMil: number;
  valorMil: number;
}

export interface Renglon350 {
  codigo: string;
  seccion: string;
  nombre: string;
  casillas: string;
  porTipoPersona: boolean;
  pj: Cifra350 | null;
  pn: Cifra350 | null;
  unico: Cifra350 | null;
  vacio: boolean;
}

export interface Formulario350 {
  mes: string;
  secciones: Array<{ titulo: string; porTipoPersona: boolean; renglones: Renglon350[] }>;
  totales: {
    renta: string;
    iva: string;
    total: string;
    exacto: string;
    centavos: { renta: number; iva: number; total: number };
  };
  sinRenglon: Array<{ documento: string; tercero: string; concepto: string; valor: string; motivo?: string }>;
  cuadre: { motor: string; libro: string; diferencia: string; cuadra: boolean };
  filas: number;
}

export interface RetencionDelMes {
  mes: string;
  fila: FilaCalendario;
  formulario: Formulario350;
}

export interface AvisoImpuestos {
  tipo: "POR_PRESENTAR" | "POR_PAGAR" | "VENCE_HOY" | "VENCIDA" | "PAGADA";
  fila: FilaCalendario;
}

export interface DatosPresentacion {
  obligacion: Obligacion;
  periodo: string;
  municipioCodigo?: string | null;
  numeroFormulario: string;
  presentadaEl: string;
  valorAPagar: number;
  vence?: string | null;
  archivoClave?: string | null;
  archivoNombre?: string | null;
  impuestoNeto?: number | null;
  anticipoSiguiente?: number | null;
}

export interface PartidaPago {
  cuentaId: string;
  codigo: string;
  nombre: string;
  terceroId: string | null;
  debito: number;
  credito: number;
}

export type ArmadoPago =
  | { ok: true; partidas: PartidaPago[]; redondeo: number; total: number }
  | { ok: false; motivo: string };

export interface PagoPrevio {
  declaracion: Declaracion;
  armado: ArmadoPago;
  /** Renta: la cuota que se va a pagar. */
  cuota: { numero: number; de: number; valor: number } | null;
}

export interface DatosPago {
  medio: "CAJA" | "BANCO";
  cajaId?: string | null;
  cuentaBancariaId?: string | null;
  fecha: string;
  recibo490: string;
  intereses: number;
}

// ─── IVA (300) ──────────────────────────────────────────────────────────────

export interface PorTarifa {
  tarifa: number;
  base: number;
  iva: number;
}

export interface IvaDelPeriodo {
  generado: { porTarifa: PorTarifa[]; total: number };
  /** Ventas a tarifa 0: exentas o excluidas, sin distinguir. */
  ventasTarifaCero: number;
  descontable: { porTarifa: PorTarifa[]; total: number };
  noDescontable: number;
  reteIvaSufrida: number;
  /** Negativo: saldo a favor. */
  saldo: number;
  mesAMes: Array<{ mes: string; generado: number; descontable: number }>;
  cuadre: { libro: number; documentos: number; diferencia: number; cuadra: boolean };
}

export interface IvaPantalla {
  configuracion: ConfiguracionImpuestos;
  periodo: string | null;
  fila: FilaCalendario | null;
  iva: IvaDelPeriodo | null;
  anterior: FilaCalendario | null;
  avance: { dia: number; dias: number; cierra: string } | null;
}

// ─── ICA y ReteICA ──────────────────────────────────────────────────────────

export interface IcaPropio {
  anio: number;
  ingresos: number;
  excluidos: number;
  base: number;
  /** Por mil; `null` sin tarifa cargada. */
  tarifaPorMil: number | null;
  fuenteTarifa: "LEY" | "PROVISIONAL" | null;
  impuesto: number | null;
  avisosTableros: boolean;
  avisos: number | null;
  total: number | null;
  anticipos: number;
  /** Negativo: saldo a favor. */
  saldo: number | null;
}

export interface IcaDeMunicipio {
  municipio: { codigo: string; nombre: string };
  principal: boolean;
  tieneLey: boolean;
  /** `null` fuera de la sede principal. */
  estimado: IcaPropio | null;
  avisosRespondido: boolean;
  fila: FilaCalendario;
  anterior: FilaCalendario | null;
}

export interface ReteIcaTercero {
  tercero: string;
  terceroDocumento: string;
  base: string;
  tarifas: string;
  retenido: string;
  centavos: { base: number; retenido: number };
}

export interface ReteIcaDelPeriodo {
  municipio: { codigo: string; nombre: string };
  periodicidad: string;
  periodo: string;
  fila: FilaCalendario;
  anterior: FilaCalendario;
  detalle: { terceros: ReteIcaTercero[]; base: string; retenido: string; centavos: number } | null;
  cuadre: { libro: number; documentos: number; diferencia: number; cuadra: boolean };
  avance: { dia: number; dias: number; cierra: string } | null;
}

export interface IcaPantalla {
  hoy: string;
  configuracion: ConfiguracionImpuestos;
  reteica: ReteIcaDelPeriodo | null;
  ica: IcaDeMunicipio[];
}

// ─── Renta (110) ────────────────────────────────────────────────────────────

export interface RentaEstimada {
  anio: number;
  utilidad: number;
  gmfNoDeducible: number;
  multas: number;
  rentaLiquida: number;
  tarifa: number;
  factorZomac: number;
  impuesto: number;
  retenciones: number;
  anticipoAnterior: number | null;
  anticipoSiguiente: { porcentaje: number; procedimiento1: number; procedimiento2: number | null; valor: number };
  /** Negativo: saldo a favor. */
  saldo: number;
  cuotas: Array<{ numero: number; valor: number }>;
}

export interface PagoCuota {
  cuota: number;
  valor: number;
  intereses: number;
  recibo490: string;
  pagadaEl: string;
}

export interface RentaPantalla {
  hoy: string;
  configuracion: ConfiguracionImpuestos;
  estimado: RentaEstimada | null;
  fila: FilaCalendario | null;
  anterior: FilaCalendario | null;
  pagos: PagoCuota[];
}
