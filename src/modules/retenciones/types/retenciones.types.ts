// Espejo de `/retenciones`.
//
// Nada de esto se carga a mano (plan motor de retenciones, Fase 0): las tarifas
// y la UVT son de la ley —las carga la plataforma con su norma y quién las
// validó— y los enlaces de cada concepto a las cuentas de la empresa los crea
// el sistema cuando la cuenta existe.

export const TIPOS_RETENCION = ["RENTA", "IVA", "ICA"] as const;
export type TipoRetencion = (typeof TIPOS_RETENCION)[number];

export const NOMBRE_TIPO_RETENCION: Record<TipoRetencion, string> = {
  RENTA: "Retefuente (renta)",
  IVA: "Reteiva",
  ICA: "Reteica",
};

/** Un concepto de la ley enlazado a las cuentas de la empresa. */
export interface ConceptoRetencionResumen {
  id: string;
  /** Solo en las filas cargadas a mano antes del motor. */
  anio: number | null;
  tipo: TipoRetencion;
  codigo: string;
  nombre: string;
  /** Donde va lo que la empresa retiene. `null` si no es agente de ese impuesto. */
  cuenta_id: string | null;
  cuenta_codigo: string | null;
  /** Donde va lo que a la empresa le retienen. */
  cuenta_activo_id: string | null;
  cuenta_activo_codigo: string | null;
  concepto_nacional_id: string | null;
  activo: boolean;
}

export interface TarifaVigencia {
  tipoPersona: "NATURAL" | "JURIDICA" | null;
  declarante: boolean | null;
  baseUvt: number;
  /** Fracción: 0.025 es 2,5 %. */
  tarifa: number;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  norma: string;
  observacion: string | null;
  validadoPor: string;
  validadoEn: string;
}

/** Un concepto de la ley con todas sus vigencias. */
export interface ConceptoLey {
  id: string;
  codigo: string;
  nombre: string;
  impuesto: TipoRetencion;
  base_es_iva: boolean;
  tarifas: TarifaVigencia[];
}

/** El valor que la DIAN fija cada año por resolución. */
export interface Uvt {
  anio: number;
  valor: string;
}

/** Lo que el servidor calcularía al guardar. */
export type Previsualizacion =
  | { retiene: false }
  | {
      retiene: true;
      base: number;
      tarifa: number;
      valor: number;
      norma?: string;
    };

// --- Motor de renta (plan motor de retenciones, Fase 1) ---------------------

export type CertezaConcepto = "CLARA" | "DEDUCIDA" | "PREGUNTA";

/** Un renglón clasificado: el concepto propuesto, de dónde salió y si falta contestarlo. */
export interface RenglonPropuesto {
  orden: number;
  concepto: string | null;
  origen: "CONFIRMADO" | "PRODUCTO" | "CIIU" | "PALABRAS" | "IA" | null;
  certeza: CertezaConcepto;
  razon: string;
  opciones?: string[];
  /** Lo que la IA también ve posible (fuente 5), para cambiar rápido. */
  alternativas?: string[];
  /** Con el que se calcula: el propuesto o el que eligieron. */
  elegido: string | null;
  /** «La deduje» sin aceptar o «Te pregunto» sin respuesta. */
  pendiente: boolean;
  /** Su concepto retiene sobre el AIU: se pide el AIU del renglón (§8.13). */
  pideAiu?: boolean;
  /** Las tarifas de convenio que se pueden aplicar (§8.15). Nunca solas. */
  convenios?: Array<{
    tipo: "INTERESES" | "REGALIAS";
    tarifa: number;
    pais: string;
    paisNombre: string;
    ley: string;
  }>;
}

export interface ExplicacionRetencion {
  motor_version: string;
  fecha_causacion: string;
  uvt: number | null;
  guardas: Array<{ regla: string; resultado: boolean; fundamento: string }>;
  clasificacion?: {
    concepto: string;
    nombre: string;
    origen: string;
    renglones: number[];
  };
  base?: { subtotal: number; descuentos: number; base_final: number };
  acumulado?: {
    anterior: number;
    con_este: number;
    umbral_uvt: number;
    umbral: number;
    supera: boolean;
  };
  cuantia_minima?: { uvt: number; valor: number; supera: boolean };
  tarifa?: {
    nominal: number;
    factor_zomac: number;
    efectiva: number;
    norma: string;
    vigencia_desde: string;
  };
  zomac?: string;
  perfil?: { desde: string; aproximado: boolean };
  resultado: number;
  texto: string;
}

export interface RetencionPropuesta {
  impuesto: "RENTA" | "IVA" | "ICA";
  /** Solo en ReteICA: dónde se causó. */
  municipio: string | null;
  /** IVA que asume la empresa (servicios del exterior): no baja lo que se paga. */
  asumida: boolean;
  conceptoCodigo: string;
  nombre: string;
  renglones: number[];
  base: number;
  /** En porcentaje: 2.5. */
  tarifa: number;
  valor: number;
  cuentaId: string | null;
  texto: string;
  explicacion: ExplicacionRetencion;
}

export interface PropuestaRenta {
  decision: "CALCULADA" | "BAJO_BASE" | "NO_SUJETO" | "REVISION";
  motivo: string;
  renglones: RenglonPropuesto[];
  retenciones: RetencionPropuesta[];
  sinRetener: Array<{ conceptoCodigo: string; nombre: string; texto: string }>;
  pendientes: number;
  /** Si algún renglón va por la tabla del art. 383: se piden los aportes (§8.14). */
  pideAportes?: boolean;
  conceptos: Array<{ codigo: string; nombre: string }>;
  /** Lo que conviene saber aunque no cambie nada hoy. */
  avisos?: string[];
  /** Solo en una factura leída: lo que trae impreso el papel. */
  impresa?: number | null;
  calculada?: number;
  difiere?: boolean;
}

/** Lo que la persona contesta sobre la propuesta. */
export interface RespuestasRenta {
  /** Por orden de renglón: el concepto aceptado o elegido. */
  conceptos: Record<number, string>;
  sinRetencion: boolean;
  motivo: string;
  /** Los aportes a salud y pensión que soporta la planilla del proveedor. */
  aportes: string;
  /** Por orden de renglón: el AIU que discrimina la factura (§8.13). */
  aiu: Record<number, string>;
  /** Por orden de renglón: el convenio que se eligió aplicar (§8.15). */
  convenios: Record<number, "INTERESES" | "REGALIAS">;
}

export const respuestasRentaVacias = (): RespuestasRenta => ({
  conceptos: {},
  sinRetencion: false,
  motivo: "",
  aportes: "",
  aiu: {},
  convenios: {},
});

/**
 * El AIU que quedó escrito en un renglón que ya no lo pide —cambió su
 * concepto—, fuera. El IVA de ese renglón se liquida sobre el AIU (art. 462-1
 * ET, bug #16): uno viejo que nadie ve lo bajaría sin razón. `null` si no hay
 * nada que quitar.
 */
export function aiuSinPedir(
  p: PropuestaRenta | undefined,
  aiu: Record<number, string>,
): Record<number, string> | null {
  if (p === undefined) return null;
  const piden = new Set(
    p.renglones.filter((r) => r.pideAiu === true).map((r) => r.orden),
  );
  const quedan = Object.fromEntries(
    Object.entries(aiu).filter(([orden]) => piden.has(Number(orden))),
  );
  return Object.keys(quedan).length === Object.keys(aiu).length
    ? null
    : quedan;
}

/** Lo que va al backend, a partir de lo contestado. */
export function aEnvioRenta(r: RespuestasRenta): {
  conceptosRenta?: Array<{ orden: number; conceptoCodigo: string }>;
  sinRetencionMotivo?: string;
  aportesSeguridadSocial?: number;
  aiuRenglones?: Array<{ orden: number; aiu: number }>;
  conveniosRenta?: Array<{ orden: number; tipo: "INTERESES" | "REGALIAS" }>;
} {
  if (r.sinRetencion) return { sinRetencionMotivo: r.motivo.trim() };
  const aportes = Number(r.aportes);
  const conAportes =
    r.aportes.trim() !== "" && Number.isFinite(aportes) && aportes > 0
      ? { aportesSeguridadSocial: aportes }
      : {};
  const aiu = Object.entries(r.aiu ?? {})
    .map(([orden, valor]) => ({ orden: Number(orden), aiu: Number(valor) }))
    .filter((x) => Number.isFinite(x.aiu) && x.aiu > 0);
  const conAiu = aiu.length > 0 ? { aiuRenglones: aiu } : {};
  const convenios = Object.entries(r.convenios ?? {}).map(([orden, tipo]) => ({
    orden: Number(orden),
    tipo,
  }));
  const conConvenio = convenios.length > 0 ? { conveniosRenta: convenios } : {};
  const conceptos = Object.entries(r.conceptos).map(
    ([orden, conceptoCodigo]) => ({
      orden: Number(orden),
      conceptoCodigo,
    }),
  );
  return conceptos.length === 0
    ? { ...conAportes, ...conAiu, ...conConvenio }
    : { conceptosRenta: conceptos, ...conAportes, ...conAiu, ...conConvenio };
}

/** Qué impide registrar, o `null`. */
export function problemaRenta(
  p: PropuestaRenta | undefined,
  r: RespuestasRenta,
): string | null {
  if (r.sinRetencion) {
    return r.motivo.trim().length < 5
      ? "Escribí por qué va sin retención."
      : null;
  }
  if (p === undefined) return null;
  if (p.decision === "REVISION") return p.motivo;
  if (p.pendientes > 0) {
    return `Confirmá el concepto de retención de ${p.pendientes === 1 ? "un renglón" : `${p.pendientes} renglones`}.`;
  }
  if (p.retenciones.some((x) => x.cuentaId === null)) {
    return "Falta la cuenta de una retención en el plan de cuentas.";
  }
  return null;
}

/** Una versión de los datos tributarios de un tercero. */
export interface VersionPerfil {
  id: string;
  tipo_persona: "NATURAL" | "JURIDICA";
  regimen_renta:
    "ORDINARIO" | "SIMPLE" | "NO_CONTRIBUYENTE" | "REGIMEN_ESPECIAL";
  declarante_renta: boolean;
  es_responsable_iva: boolean;
  es_gran_contribuyente: boolean;
  es_autorretenedor_renta: boolean;
  es_agente_ret_iva: boolean;
  es_zomac: boolean;
  zomac_tamano: "MICRO" | "PEQUENA" | "MEDIANA" | "GRANDE" | null;
  ciiu_principal: string | null;
  contrato_dos_o_mas_trabajadores?: boolean;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  fuente: string;
  aprobado_por_nombre: string | null;
  aprobado_en: string | null;
}

export interface NuevoPerfilInput {
  regimenRenta: VersionPerfil["regimen_renta"];
  declaranteRenta: boolean;
  esResponsableIva: boolean;
  esGranContribuyente: boolean;
  esAutorretenedorRenta: boolean;
  esAgenteRetIva?: boolean;
  esZomac?: boolean;
  zomacTamano?: "MICRO" | "PEQUENA" | "MEDIANA" | "GRANDE";
  ciiuPrincipal?: string;
  /** Persona natural: contrató dos o más trabajadores (art. 383 par. 2). */
  contratoDosOMasTrabajadores?: boolean;
  vigenciaDesde: string;
}

/** Aciertos de una fuente: `origen` null es «nadie propuso, se preguntó». */
export interface AciertoFuente {
  origen: string | null;
  total: number;
  aciertos: number;
  /** Solo en la consola: de cuántas empresas. */
  empresas?: number;
}

export interface AprendidoConcepto {
  id: string;
  llave_renglon: string | null;
  origen: "CONFIRMADO" | "CORREGIDO";
  veces: number;
  actualizado_en: string;
  concepto: string;
  concepto_nombre: string;
  proveedor: string | null;
  producto: string | null;
  confirmado_por: string | null;
}

export interface RetencionCalculadaGuardada {
  id: string;
  impuesto: "RENTA" | "IVA" | "ICA";
  concepto: string;
  concepto_nombre: string;
  base: string;
  tarifa_efectiva: string;
  valor: string;
  norma_aplicada: string;
  origen_clasificacion: string;
  estado: string;
  explicacion: ExplicacionRetencion & { reversa_de?: string };
  fecha_causacion: string;
}

/** El ICA de la empresa en un municipio con sede (`GET /retenciones/ica`). */
export interface IcaMunicipioEmpresa {
  codigo: string;
  nombre: string;
  es_principal: boolean;
  es_agente_retenedor: boolean | null;
  es_autorretenedor: boolean | null;
  base_minima_uvt_compras: string | null;
  base_minima_uvt_servicios: string | null;
  tarifa_general_por_mil: string | null;
  usa_tarifa_por_actividad: boolean | null;
  acumula_en_periodo: boolean | null;
  periodicidad: string | null;
  acuerdo: string | null;
  tarifas_por_actividad: number;
}

/** El ICA de un proveedor en un municipio, con vigencia. */
export interface IcaTercero {
  id: string;
  municipio_codigo: string;
  municipio: string;
  ica_regimen: "COMUN" | "PREFERENCIAL" | "NO_CONTRIBUYENTE";
  es_agente_ret_ica: boolean;
  es_autorretenedor_ica: boolean;
  codigo_actividad_local: string | null;
  resolucion: string | null;
  vigencia_desde: string;
  vigencia_hasta: string | null;
}

export interface NuevoIcaTerceroInput {
  municipioCodigo: string;
  icaRegimen: IcaTercero["ica_regimen"];
  esAutorretenedorIca: boolean;
  codigoActividadLocal?: string;
  resolucion?: string;
  vigenciaDesde: string;
}

/** Una diferencia que dejó un recálculo por cambio de norma (Fase 6, §6.3). */
export interface DiferenciaRecalculo {
  id: string;
  estado: "PENDIENTE" | "AJUSTADA" | "DESCARTADA";
  fecha: string;
  impuesto: "RENTA" | "IVA" | "ICA";
  concepto: string;
  municipio: string | null;
  documento: string | null;
  /** Una venta es una autorretención (§8.10). */
  documentoTipo: "COMPRA" | "VENTA";
  tercero: string;
  base: string;
  valorAntes: string;
  valorNuevo: string;
  diferencia: string;
  texto: string | null;
  /** La norma que cambió: el motivo del recálculo. */
  norma: string;
  recalculadoEn: string;
  motivo: string | null;
  resueltaEn: string | null;
  asiento: string | null;
}

/** El asiento que corregiría una diferencia, antes de aprobarlo. */
export interface AjustePropuesto {
  texto: string | null;
  diferencia: number;
  lineas: Array<{
    codigo: string;
    cuenta: string;
    debito: number;
    credito: number;
  }>;
}

/** Lo que una factura leída dice del proveedor y no coincide (Fase 8, §8.8). */
export interface PropuestaPerfil {
  id: string;
  terceroId: string;
  tercero: string;
  /** Desde cuándo regiría: la fecha de la factura. */
  desde: string;
  referencia: string | null;
  creadoEn: string;
  cambios: Array<{
    campo: string;
    antes: string | boolean | null;
    propuesto: string | boolean;
    texto: string;
  }>;
}

/** La residencia fiscal de un proveedor del exterior (Fase 8, §8.15). */
export interface ResidenciaFiscal {
  exterior: boolean;
  residencias: Array<{
    id: string;
    paisCodigo: string;
    paisNombre: string | null;
    certificadoDesde: string;
    certificadoHasta: string;
    observacion: string | null;
  }>;
  paises: Array<{ codigo: string; nombre: string }>;
}
