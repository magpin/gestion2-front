// Espejo de `/plataforma/*`.
//
// El administrador del producto ve cuentas, no contabilidades. No hay tipos para
// asientos, facturas ni terceros porque no hay endpoints que los devuelvan: la
// separación es del backend, no una omisión de este archivo.

export interface AdminPlataforma {
  adminId: string;
  email: string;
}

export type EstadoCuenta = "ACTIVO" | "SUSPENDIDO" | "MOROSO" | "CANCELADO";
export type Plan = "BASICO" | "PROFESIONAL" | "CONTADOR" | "EMPRESARIAL";

export const PLANES: Plan[] = [
  "BASICO",
  "PROFESIONAL",
  "CONTADOR",
  "EMPRESARIAL",
];

export const NOMBRE_PLAN: Record<Plan, string> = {
  BASICO: "Básico",
  PROFESIONAL: "Profesional",
  CONTADOR: "Contador",
  EMPRESARIAL: "Empresarial",
};

export const NOMBRE_ESTADO: Record<EstadoCuenta, string> = {
  ACTIVO: "Activa",
  MOROSO: "Morosa",
  SUSPENDIDO: "Suspendida",
  CANCELADO: "Cancelada",
};

export interface Cuenta {
  id: string;
  nombre: string;
  slug: string;
  plan: Plan;
  estado: EstadoCuenta;
  maxEmpresas: number;
  maxUsuarios: number;
  empresas: number;
  usuarios: number;
  creadoEn: string;
  ultimoAcceso: string | null;
  estadoDesde: string;
  iaMesUsd: number;
}

export type FiltroCuentas =
  | "TODAS"
  | "ACTIVAS"
  | "MOROSAS"
  | "SUSPENDIDAS"
  | "CERCA_CUPO"
  | "SIN_ACTIVIDAD";

export type OrdenCuentas =
  | "nombre"
  | "plan"
  | "estado"
  | "empresas"
  | "usuarios"
  | "ia"
  | "acceso"
  | "alta";

export interface PaginaCuentas {
  filas: Cuenta[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: Record<FiltroCuentas, number>;
}

export interface PlanCatalogo {
  clave: Plan;
  nombre: string;
  maxEmpresas: number;
  maxUsuarios: number;
  /** Nulos hasta la fase 2 (cobros): se muestran como «sin configurar». */
  precioMensual: number | null;
  topeIaUsd: number | null;
  alLlegarTope: "AVISAR" | "FRENAR" | null;
}

export interface PlanConCuentas extends PlanCatalogo {
  cuentas: number;
}

export interface AvanceConfiguracion {
  completados: number;
  total: number;
  porcentaje: number;
  completa: boolean;
  pendientes: string[];
}

export interface EmpresaDeCuenta {
  id: string;
  razonSocial: string;
  nit: string;
  dv: string;
  activo: boolean;
  sectores: string[];
  grupoNiif: string | null;
  sedes: number;
  configuracion: AvanceConfiguracion;
  iaMesUsd: number;
}

export interface UsuarioDeCuenta {
  id: string;
  email: string;
  nombreCompleto: string;
  activo: boolean;
  ultimoAcceso: string | null;
  esAdmin: boolean;
  roles: string[];
}

export interface EntradaBitacora {
  id: string;
  accion: string;
  detalle: Record<string, unknown>;
  ocurridoEn: string;
  admin: string;
  cuentaId?: string | null;
  cuenta?: string | null;
}

/** Lo que paga la cuenta, en pesos. */
export interface CobroCuenta {
  /** El vigente: el pactado o, si no hay, el del plan. Null si no hay ninguno. */
  precio: number | null;
  precioPactado: number | null;
  diaCorte: number;
  proximoCobro: string;
  saldo: number;
  vencido: number;
  diasMora: number;
  ultimoPago: { fecha: string; monto: number } | null;
}

export type EstadoCargo = "PAGADO" | "PARCIAL" | "PENDIENTE" | "VENCIDO";

export interface Suscripcion {
  precio: number | null;
  precioPactado: number | null;
  diaCorte: number;
  cobroDesde: string;
  proximoCobro: string;
  estado: {
    cargos: {
      id: string;
      periodo: string;
      plan: string;
      monto: number;
      venceEn: string;
      pagado: number;
      estado: EstadoCargo;
    }[];
    totalCargado: number;
    totalPagado: number;
    saldo: number;
    vencido: number;
    diasMora: number;
  };
  ultimoPago: { fecha: string; monto: number } | null;
  pagos: {
    id: string;
    fecha: string;
    monto: number;
    medio: string;
    referencia: string | null;
    registradoEn: string;
    admin: string;
  }[];
}

export const MEDIOS_PAGO: Record<string, string> = {
  TRANSFERENCIA: "Transferencia",
  PSE: "PSE",
  TARJETA: "Tarjeta",
  EFECTIVO: "Efectivo",
  CONSIGNACION: "Consignación",
  OTRO: "Otro",
};

export interface EstadoSistema {
  api: { estado: string; version: string; desde: string };
  base: { conectada: boolean; aislamientoActivo: boolean };
  proveedorIa: {
    estado: "FUNCIONANDO" | "INESTABLE" | "CAIDO" | "SIN_DATOS";
    ultimaRespuestaOk: string | null;
    ultimaFalla: string | null;
  };
  ultimas24h: {
    respuestas: number;
    respuestasFallidas: number;
    respuestasCortadas: number;
    lecturas: number;
    lecturasFallidas: number;
  };
  pausas: PausaIa[];
}

export interface PausaIa {
  id: string;
  cuentaId: string | null;
  cuenta: string | null;
  usos: ("CHAT" | "LECTURA")[];
  motivo: string;
  desde: string;
  admin: string;
}

export interface Anuncio {
  id: string;
  titulo: string;
  cuerpo: string;
  tono: "INFORMATIVO" | "MANTENIMIENTO";
  cuentas: string[] | null;
  nombresCuentas: string[];
  desde: string;
  hasta: string;
  retiradoEn: string | null;
  admin: string;
  estado: "PROGRAMADO" | "VIGENTE" | "TERMINADO" | "RETIRADO";
}

export interface AdministradorPlataforma {
  id: string;
  email: string;
  nombreCompleto: string;
  activo: boolean;
  ultimoAcceso: string | null;
  creadoEn: string;
  fallidos24h: number;
  fallidos7d: number;
  ultimoFallido: string | null;
}

export interface DetalleCuenta {
  cuenta: Cuenta;
  plan: PlanCatalogo | null;
  cobro: CobroCuenta | null;
  empresas: EmpresaDeCuenta[];
  usuarios: UsuarioDeCuenta[];
  bitacora: EntradaBitacora[];
}

export interface PaginaBitacora {
  filas: EntradaBitacora[];
  total: number;
  pagina: number;
  porPagina: number;
  admins: { id: string; nombre: string }[];
}

export interface GastoEmpresa {
  empresaId: string;
  empresa: string;
  cuentaId: string;
  cuenta: string;
  costoUsd: number;
}

export interface Inicio {
  revisadoEn: string;
  hoy: string;
  medicionDesde: string | null;
  accesosDesde: string | null;
  pendientes: {
    morosas: { id: string; nombre: string; dias: number; vencido: number }[];
    pagosVencidos: {
      id: string;
      nombre: string;
      dias: number;
      vencido: number;
    }[];
    cercaCupo: {
      id: string;
      nombre: string;
      recurso: "EMPRESAS" | "USUARIOS";
      usados: number;
      max: number;
    }[];
    iaDisparada: (GastoEmpresa & { promedioUsd: number; veces: number })[];
    lecturasFallidas: { tipo: string; cantidad: number }[];
    sinConfigurar: {
      cuentaId: string;
      cuenta: string;
      dias: number;
      sinEmpresa: boolean;
      empresas: (AvanceConfiguracion & { id: string; razonSocial: string })[];
    }[];
    sinEntrar: {
      id: string;
      nombre: string;
      dias: number;
      nuncaEntro: boolean;
    }[];
  };
  cifras: {
    activas: number;
    nuevas: number;
    nuevasMesPasado: number;
    seFueron: number;
    seFueronMesPasado: number;
    iaMesUsd: number;
    iaMesPasadoUsd: number;
    /** Lo que se cobra al mes a las cuentas activas y morosas. */
    ingresoMensual: number | null;
    facturadoMes: number;
    facturadoMesPasado: number;
    /** Lo vencido sin pagar, de todas las cuentas. */
    porCobrar: number;
  };
  iaPorMes: { mes: string; usd: number; facturado: number }[];
  porEstado: Record<EstadoCuenta, number>;
  porPlan: {
    clave: Plan;
    nombre: string;
    cuentas: number;
    precioMensual: number | null;
    facturadoMes: number;
  }[];
  topIa: (GastoEmpresa & {
    respuestas: number;
    documentos: number;
    plan: Plan | null;
    planNombre: string | null;
    pagaMensual: number | null;
  })[];
  actividad: {
    hoy: number;
    ayer: number;
    semana: number;
    usuariosActivos: number;
    empresasActivas: number;
    empresas: number;
  };
}

export interface ResultadoBusqueda {
  cuentas: { id: string; nombre: string; plan: Plan; estado: EstadoCuenta }[];
  empresas: {
    id: string;
    razonSocial: string;
    nit: string;
    dv: string;
    cuentaId: string;
    cuenta: string;
  }[];
  usuarios: {
    id: string;
    email: string;
    nombreCompleto: string;
    cuentaId: string;
    cuenta: string;
    roles: string[];
  }[];
}

/** Lo que responde el backend cuando un cambio de plan o de cupos no cabe. */
export interface Exceso {
  recurso: "EMPRESAS" | "USUARIOS";
  usados: number;
  permitidos: number;
}

export const NOMBRE_ACCION: Record<string, string> = {
  CREAR_CUENTA: "Creó la cuenta",
  CREAR_EMPRESA: "Creó una empresa",
  CREAR_USUARIO: "Creó un usuario",
  CAMBIAR_ESTADO: "Cambió el estado",
  CAMBIAR_PLAN: "Cambió el plan",
  AJUSTAR_CUPOS: "Ajustó los cupos",
  RENOMBRAR_CUENTA: "Cambió el nombre",
  RESTABLECER_PASSWORD: "Restableció una contraseña",
  DESACTIVAR_USUARIO: "Desactivó un usuario",
  REACTIVAR_USUARIO: "Reactivó un usuario",
  EDITAR_PLAN: "Editó un plan",
  CAMBIAR_SUSCRIPCION: "Cambió el precio o el corte",
  REGISTRAR_PAGO: "Registró un pago",
  PAUSAR_IA: "Pausó la IA",
  REANUDAR_IA: "Reanudó la IA",
  PUBLICAR_ANUNCIO: "Publicó un anuncio",
  RETIRAR_ANUNCIO: "Retiró un anuncio",
  DESACTIVAR_ADMIN: "Desactivó un administrador",
  REACTIVAR_ADMIN: "Reactivó un administrador",
  RESTABLECER_ADMIN: "Restableció un administrador",
  CARGAR_TARIFA_RETENCION: "Cargó una tarifa de retención",
  CARGAR_UVT: "Cargó la UVT de un año",
  CARGAR_PARAMETRO_ICA: "Cargó la ley de ICA de un municipio",
  CARGAR_AUTORRETENCION: "Cargó una tarifa de autorretención",
};

// --- Ley de retenciones (plan motor de retenciones, Fase 0, §0.8) ----------

export interface TarifaLeyPlataforma {
  tipoPersona: "NATURAL" | "JURIDICA" | null;
  declarante: boolean | null;
  baseUvt: number;
  /** Fracción: 0.025 es 2,5 %. */
  tarifa: number;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  norma: string;
  validadoPor: string;
  validadoEn: string;
}

export interface ConceptoLeyPlataforma {
  codigo: string;
  nombre: string;
  impuesto: "RENTA" | "IVA" | "ICA";
  tarifas: TarifaLeyPlataforma[];
}

export interface LeyRetenciones {
  conceptos: ConceptoLeyPlataforma[];
  uvt: Array<{
    anio: number;
    valor: string;
    norma: string | null;
    validadoPor: string | null;
    validadoEn: string | null;
  }>;
  migracion: Array<{
    migracion: string;
    que: string;
    detalle: Record<string, unknown>;
    creadoEn: string;
  }>;
}

export const NOMBRE_ROL: Record<string, string> = {
  ADMIN_TENANT: "Administrador de la cuenta",
  DIRECTOR: "Director",
  CONTADOR: "Contador",
  VENTAS: "Ventas",
  COMPRAS: "Compras",
  INVENTARIO: "Inventario",
  CAJA: "Caja",
  CONSULTA: "Consulta",
};

export const NOMBRE_DOCUMENTO: Record<string, string> = {
  RUT: "RUT",
  CAMARA_COMERCIO: "Cámara de Comercio",
  RESOLUCION_DIAN: "Resolución de la DIAN",
};

/** Una vigencia de la autorretención especial de un CIIU (`GET /plataforma/retenciones/autorretencion`). */
export interface AutorretencionPlataforma {
  ciiu: string;
  /** Fracción: 0.008 es 0,8 %. */
  tarifa: string;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  norma: string;
  validadoPor: string;
  validadoEn: string;
}

export interface NuevaAutorretencionInput {
  ciiu: string;
  tarifaPorcentaje: number;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  norma: string;
  validadoPor: string;
  validadoEn: string;
}

/** La ley de ICA de un municipio para un año (`GET /plataforma/retenciones/ica`). */
export interface IcaMunicipioPlataforma {
  municipio_codigo: string;
  municipio: string;
  anio: number;
  base_minima_uvt_compras: string | null;
  base_minima_uvt_servicios: string | null;
  tarifa_general_por_mil: string | null;
  usa_tarifa_por_actividad: boolean;
  acumula_en_periodo: boolean;
  periodicidad: string;
  acuerdo: string;
  validadoPor: string;
  validadoEn: string;
  tarifas: number;
  matriz: number;
}

export interface NuevoIcaMunicipioInput {
  municipioCodigo: string;
  anio: number;
  baseMinimaUvtCompras?: number;
  baseMinimaUvtServicios?: number;
  tarifaGeneralPorMil?: number;
  usaTarifaPorActividad: boolean;
  acumulaEnPeriodo: boolean;
  periodicidad: "MENSUAL" | "BIMESTRAL" | "TRIMESTRAL" | "ANUAL";
  acuerdo: string;
  validadoPor: string;
  validadoEn: string;
  tarifas?: Array<{
    codigoActividad: string;
    ciiu?: string;
    descripcion?: string;
    tipo: "INDUSTRIAL" | "COMERCIAL" | "SERVICIOS" | "FINANCIERA";
    tarifaPorMil: number;
  }>;
}

/** Las cifras de un recálculo de retenciones (Fase 6, §6.3). */
export interface ResumenRecalculo {
  empresas: number;
  documentos: number;
  diferencias: number;
  sinEntrada: number;
  conError: number;
  porEmpresa?: Array<{
    empresaId: string;
    empresa: string;
    documentos?: number;
    diferencias?: number;
    sinEntrada?: number;
    sinCalcular?: string[];
    error?: string;
  }>;
}

export interface RecalculoPlataforma {
  id: string;
  desde: string;
  hasta: string;
  motivo: string;
  creadoEn: string;
  /** NULL = todas las empresas. */
  empresa: string | null;
  resumen: ResumenRecalculo;
}

export interface DetalleRecalculo {
  id: string;
  desde: string;
  hasta: string;
  motivo: string;
  creadoEn: string;
  resumen: ResumenRecalculo;
  diferencias: Array<{
    id: string;
    empresa: string;
    fecha: string;
    documento: string | null;
    impuesto: string;
    concepto: string;
    municipio: string | null;
    valorAntes: string;
    valorNuevo: string;
    diferencia: string;
    estado: "PENDIENTE" | "AJUSTADA" | "DESCARTADA";
    motivo: string | null;
    texto: string | null;
  }>;
}
