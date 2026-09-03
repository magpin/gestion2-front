"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import type {
  EmpresaAccesible,
  RolCodigo,
  Usuario,
} from "@/modules/auth/types/auth.types";

// secure solo en producción (https); en dev http el cookie no se setearía.
const COOKIE_OPTS = {
  expires: 1,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
};

/** El proxy lee estas dos cookies para saber hasta dónde puede entrar la persona. */
const COOKIE_SESION = "sesion";
const COOKIE_EMPRESA = "empresa";

/**
 * La sesión, en dos etapas.
 *
 * Entrar y elegir contabilidad son actos distintos. Tras el login hay un token de
 * SESION que solo sirve para listar empresas y elegir una; al elegirla se cambia
 * por uno de TRABAJO que lleva la empresa y los roles firmados dentro.
 *
 * Se guarda un solo `token` —el vigente— y aparte `empresaId`, que es lo que
 * distingue una etapa de la otra. Guardar los dos tokens a la vez no aporta: el
 * de sesión no vuelve a usarse una vez elegida la empresa.
 *
 * Los ROLES son una lista porque una sola persona vende, compra, maneja bodega y
 * cuenta la caja. Sirven para no mostrar puertas cerradas; quién puede hacer qué
 * lo decide el backend.
 */
interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  /** Las empresas a las que puede entrar. Se llena en el login. */
  empresas: EmpresaAccesible[];
  /** La empresa elegida. Null entre el login y la elección. */
  empresaId: string | null;
  roles: RolCodigo[];

  /** Autenticado, con o sin empresa elegida. */
  autenticado: boolean;
  /** Autenticado Y con empresa: recién acá se puede operar. */
  operando: boolean;

  iniciarSesion: (
    token: string,
    usuario: Usuario,
    roles: RolCodigo[],
    empresas: EmpresaAccesible[],
  ) => void;
  elegirEmpresa: (token: string, empresaId: string, roles: RolCodigo[]) => void;
  /** Vuelve al selector sin cerrar sesión: es lo que hace un contador al cambiar de cliente. */
  salirDeEmpresa: () => void;
  cerrarSesion: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      empresas: [],
      empresaId: null,
      roles: [],
      autenticado: false,
      operando: false,

      iniciarSesion: (token, usuario, roles, empresas) => {
        Cookies.set(COOKIE_SESION, token, COOKIE_OPTS);
        Cookies.remove(COOKIE_EMPRESA);
        set({
          token,
          usuario,
          empresas,
          empresaId: null,
          // Los de ambito cuenta. Los de la empresa se suman al elegirla.
          roles,
          autenticado: true,
          operando: false,
        });
      },

      elegirEmpresa: (token, empresaId, roles) => {
        // El token de trabajo reemplaza al de sesión: el viejo ya no se usa.
        Cookies.set(COOKIE_SESION, token, COOKIE_OPTS);
        Cookies.set(COOKIE_EMPRESA, empresaId, COOKIE_OPTS);
        set({ token, empresaId, roles, operando: true });
      },

      salirDeEmpresa: () => {
        // Se pierde el token de trabajo a propósito: hay que pedir uno nuevo para
        // la otra empresa, y ese es el momento en que el backend relee los roles.
        Cookies.remove(COOKIE_EMPRESA);
        Cookies.remove(COOKIE_SESION);
        set({ token: null, empresaId: null, roles: [], autenticado: false, operando: false });
      },

      cerrarSesion: () => {
        Cookies.remove(COOKIE_SESION);
        Cookies.remove(COOKIE_EMPRESA);
        set({
          token: null,
          usuario: null,
          empresas: [],
          empresaId: null,
          roles: [],
          autenticado: false,
          operando: false,
        });
      },
    }),
    { name: "auth" },
  ),
);

/** Tiene alguno de los roles pedidos. Los permisos se suman. */
export function tieneRol(...roles: RolCodigo[]): boolean {
  const propios = useAuthStore.getState().roles;
  return roles.some((r) => propios.includes(r));
}
