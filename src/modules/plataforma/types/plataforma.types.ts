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

export interface ResumenCuenta {
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
}

export interface EmpresaDeCuenta {
  id: string;
  razon_social: string;
  nit: string;
  dv: string;
  /** Puede venir vacio: marcarlo no es obligatorio al dar de alta. */
  sectores: string[];
  grupo_niif: string | null;
  sedes: number;
  activo: boolean;
}

export interface UsuarioDeCuenta {
  id: string;
  email: string;
  nombre_completo: string;
  activo: boolean;
  ultimo_acceso_en: string | null;
  es_admin: boolean;
  roles: string[];
}

export interface EntradaBitacora {
  accion: string;
  detalle: Record<string, unknown>;
  ocurrido_en: string;
  admin: string;
}

export interface DetalleCuenta {
  cuenta: ResumenCuenta;
  empresas: EmpresaDeCuenta[];
  usuarios: UsuarioDeCuenta[];
  bitacora: EntradaBitacora[];
}

export const NOMBRE_ACCION: Record<string, string> = {
  CREAR_CUENTA: "Creó la cuenta",
  CREAR_EMPRESA: "Creó una empresa",
  CREAR_USUARIO: "Creó un usuario",
  CAMBIAR_ESTADO: "Cambió el estado",
  CAMBIAR_PLAN: "Cambió el plan",
};
