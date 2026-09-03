// Espejo del contrato del backend. Entrar son DOS actos, no uno.
//
// `POST /auth/login` verifica credenciales y devuelve un token de SESION más la
// lista de empresas accesibles. Ese token no sirve para operar: hay que cambiarlo
// por uno de TRABAJO con `POST /auth/empresa`.
//
// Existe porque un contador lleva la contabilidad de quince clientes y cambia de
// una a otra durante el día. Meter la empresa dentro del login lo obligaría a
// salir y volver a entrar cada vez.

/** Los ocho roles del catálogo `rol` del backend. */
export type RolCodigo =
  /** Ámbito cuenta: crea empresas, invita usuarios, gestiona la suscripción. */
  | "ADMIN_TENANT"
  /** Autoriza excepciones, ve todos los reportes y cierra períodos. No es superusuario. */
  | "DIRECTOR"
  /** Único que escribe asientos manuales. */
  | "CONTADOR"
  | "VENTAS"
  | "COMPRAS"
  | "INVENTARIO"
  | "CAJA"
  | "CONSULTA";

/** Los roles que se ejercen dentro de una contabilidad. `ADMIN_TENANT` no. */
export const ROLES_EMPRESA: readonly RolCodigo[] = [
  "DIRECTOR",
  "CONTADOR",
  "VENTAS",
  "COMPRAS",
  "INVENTARIO",
  "CAJA",
  "CONSULTA",
];

export const NOMBRE_ROL: Record<RolCodigo, string> = {
  ADMIN_TENANT: "Administrador de la cuenta",
  DIRECTOR: "Director",
  CONTADOR: "Contador",
  VENTAS: "Ventas",
  COMPRAS: "Compras",
  INVENTARIO: "Inventario",
  CAJA: "Caja",
  CONSULTA: "Solo lectura",
};

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
}

/** Una empresa a la que el usuario puede entrar, con los roles que ejerce en ella. */
export interface EmpresaAccesible {
  id: string;
  razonSocial: string;
  nit: string;
  dv: string;
  roles: RolCodigo[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** `POST /auth/login` — paso 1, cuando quien entra es de un cliente. */
export interface LoginCliente {
  ambito: "CLIENTE";
  token: string;
  usuario: Usuario;
  /** Roles de ambito cuenta. Deciden si a alguien sin empresas se le ofrece crear la primera. */
  roles: RolCodigo[];
  empresas: EmpresaAccesible[];
}

/**
 * `POST /auth/login` cuando el correo administra el producto.
 *
 * Es el mismo endpoint: los dos almacenes de credenciales siguen separados en el
 * backend, pero la puerta es una sola y `ambito` dice cuál se abrió. Antes había
 * que provocar un 401 contra `/auth/login` para saberlo.
 */
export interface LoginPlataforma {
  ambito: "PLATAFORMA";
  token: string;
  admin: { adminId: string; email: string };
}

export type LoginResponse = LoginCliente | LoginPlataforma;

/** `POST /auth/empresa` — paso 2. Acá sí. */
export interface EleccionEmpresaResponse {
  token: string;
  /** Los de la empresa más los de la cuenta: los permisos se suman. */
  roles: RolCodigo[];
}

/** `GET /auth/yo` — lo que dice el token que se está usando. */
export interface Sesion {
  usuarioId: string;
  tenantId: string;
  /** Null mientras no se haya elegido empresa. */
  empresaId: string | null;
  roles: RolCodigo[];
}
