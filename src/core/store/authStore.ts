"use client";

import { useSyncExternalStore } from "react";
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
  /** La lista releída del backend: una empresa recién creada no estaba al entrar. */
  actualizarEmpresas: (empresas: EmpresaAccesible[]) => void;
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

      actualizarEmpresas: (empresas) => set({ empresas }),

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

/**
 * Tiene alguno de los roles pedidos, fuera de un render (un `onClick`, una
 * validación antes de llamar a la API). Los permisos se suman.
 *
 * No usar esto para decidir qué renderizar: zustand rehidrata desde
 * `localStorage` apenas este módulo se evalúa en el cliente, antes de que
 * React llegue a hidratar el árbol, así que el valor que ve el servidor
 * (sin `localStorage`, siempre `[]`) y el que ve el cliente en ese primer
 * render pueden no coincidir. Usarlo para un atributo que el HTML del
 * servidor ya fijó —como `disabled`— dispara un error de hidratación. Para
 * eso está `useTieneRol`.
 */
export function tieneRol(...roles: RolCodigo[]): boolean {
  const propios = useAuthStore.getState().roles;
  return roles.some((r) => propios.includes(r));
}

/**
 * Igual que `tieneRol`, pero seguro para decidir qué renderizar.
 *
 * `useSyncExternalStore` es el truco: React llama a `getServerSnapshot`
 * —acá, `false`— tanto en el servidor como en el primer render del cliente
 * durante la hidratación, así que los dos coinciden con lo que ya mandó el
 * servidor y no hay nada que discrepe. Recién en el siguiente render, ya
 * montado, usa `getSnapshot` y lee el valor real. Nada de `useEffect` +
 * `setState`: eso dispara un render en cascada que el compilador de React
 * ya marca como error en este proyecto.
 */
export function useTieneRol(...roles: RolCodigo[]): boolean {
  const propios = useAuthStore((s) => s.roles);
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return montado && roles.some((r) => propios.includes(r));
}
