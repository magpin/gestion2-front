// Espejo de `/retenciones`.
//
// El catálogo de qué se retiene, a qué tarifa y desde qué monto. El sistema no
// inventa las tarifas: cambian todos los años, la de ICA sale del acuerdo de
// cada municipio, y equivocarse le cuesta plata a alguien. Las carga y las
// valida un contador.

export const TIPOS_RETENCION = ["RENTA", "IVA", "ICA"] as const;
export type TipoRetencion = (typeof TIPOS_RETENCION)[number];

export const NOMBRE_TIPO_RETENCION: Record<TipoRetencion, string> = {
  RENTA: "Retefuente (renta)",
  IVA: "Reteiva",
  ICA: "Reteica",
};

export interface ConceptoRetencionResumen {
  id: string;
  anio: number;
  tipo: TipoRetencion;
  codigo: string;
  nombre: string;
  /** En porcentaje. Una tarifa de ICA en por mil se carga dividida: 7‰ es 0.7. */
  tarifa: string;
  /** Solo en RENTA: la tarifa cuando el beneficiario no declara renta. */
  tarifa_no_declarante: string | null;
  /** En UVT, no en pesos: el valor en pesos cambia cada año y la base no. */
  base_minima_uvt: string;
  cuenta_id: string;
  cuenta_codigo: string | null;
  activo: boolean;
}

export interface CrearConceptoInput {
  anio: number;
  tipo: TipoRetencion;
  codigo: string;
  nombre: string;
  tarifa: number;
  tarifaNoDeclarante?: number;
  baseMinimaUvt?: number;
  cuentaId: string;
}

/** El valor que la DIAN fija cada año por resolución. */
export interface Uvt {
  anio: number;
  valor: string;
}
