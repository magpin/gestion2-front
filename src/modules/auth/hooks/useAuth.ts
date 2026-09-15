"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { mensajeDeError } from "@/core/api/api";
import { useAuthStore } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { configuracionService } from "@/modules/configuracion/services/configuracion.service";
import { sesionPlataforma } from "@/modules/plataforma/services/plataforma.service";
import { authService } from "../services/auth.service";
import type { LoginCliente, LoginPayload } from "../types/auth.types";

/** Lo que devuelve el login: por dónde sigue la persona. */
type ResultadoEntrada =
  | { ambito: "CLIENTE"; datos: LoginCliente }
  | { ambito: "PLATAFORMA" };

/**
 * Una sola puerta, y ahora también una sola petición.
 *
 * Los administradores del producto y los usuarios de un cliente viven en tablas
 * distintas —y eso se queda así, porque un error en el login de clientes no debe
 * alcanzar las credenciales de administración—. Pero eso es un detalle interno:
 * quien entra escribe su correo en la misma pantalla y `POST /auth/login`
 * responde con `ambito`, que dice a dónde llevarlo.
 *
 * Antes había que provocar un 401 contra el login de clientes para después
 * probar el de plataforma. Eso significaba que toda entrada de administración
 * empezaba con un intento fallido, y que un 401 legítimo —una clave mal escrita—
 * disparaba una segunda petición inútil.
 */
async function entrar(credenciales: LoginPayload): Promise<ResultadoEntrada> {
  const datos = await authService.login(credenciales);

  if (datos.ambito === "PLATAFORMA") {
    sesionPlataforma.guardar(datos.token);
    return { ambito: "PLATAFORMA" };
  }

  return { ambito: "CLIENTE", datos };
}

/**
 * Si el usuario tiene una sola empresa se entra directo: obligarlo a elegir en
 * una lista de uno es un clic que no decide nada. Con varias, va al selector.
 */
export const useLogin = () => {
  const router = useRouter();
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);
  const elegir = useElegirEmpresa();

  return useMutation({
    mutationFn: entrar,
    onSuccess: (resultado) => {
      if (resultado.ambito === "PLATAFORMA") {
        router.push("/plataforma");
        return;
      }

      const { token, usuario, roles, empresas } = resultado.datos;
      iniciarSesion(token, usuario, roles, empresas);

      if (empresas.length === 1) {
        elegir.mutate(empresas[0].id);
        return;
      }

      aviso.exito(`Hola, ${usuario.nombre}`);
      router.push("/empresa");
    },
    // El mensaje sale del intento de cliente y es el mismo en los dos casos:
    // decir "ese correo es de administración" delataría quién administra.
    onError: (error: unknown) => aviso.error(mensajeDeError(error)),
  });
};

/**
 * Paso 2 — elegir contabilidad.
 *
 * Los roles llegan del backend en este momento y quedan firmados en el token
 * nuevo. Es el punto donde se releen: si el director quitó un permiso, se aplica
 * al volver a elegir empresa.
 */
export const useElegirEmpresa = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const guardarEleccion = useAuthStore((s) => s.elegirEmpresa);

  return useMutation({
    mutationFn: (empresaId: string) =>
      authService.elegirEmpresa(empresaId).then((r) => ({ ...r, empresaId })),
    onSuccess: async ({ token, empresaId, roles }) => {
      // Los roles llegan ya sumados: los de la empresa mas los de la cuenta.
      guardarEleccion(token, empresaId, roles);
      // Sin datos de la empresa anterior en caché: son contabilidades distintas.
      queryClient.clear();

      // Al asistente va solo la empresa recién entregada, a la que le falta todo:
      // mandarla al tablero mostraría seis tarjetas en ámbar sin decirle por
      // dónde empezar. La que ya configuró algo entra a operar: el tablero le
      // muestra lo que falta —una resolución, típicamente— con su "Continuar",
      // y no se puede obligar a quien lleva meses trabajando a pasar por el
      // asistente cada vez que entra.
      try {
        const estado = await configuracionService.estado();
        router.push(
          estado.completados > 0 || !estado.siguiente
            ? "/dashboard"
            : `/configuracion/${estado.siguiente.toLowerCase()}`,
        );
      } catch {
        // Si el estado no responde, el tablero igual lo vuelve a pedir y muestra
        // el error ahí. Quedarse en el selector sería peor.
        router.push("/dashboard");
      }
    },
    onError: (error: unknown) => aviso.error(mensajeDeError(error)),
  });
};

/** Vuelve al selector sin cerrar sesión. Un contador cambia de cliente varias veces al día. */
export const useCambiarEmpresa = () => {
  const salir = useAuthStore((s) => s.salirDeEmpresa);
  const queryClient = useQueryClient();

  return () => {
    salir();
    queryClient.clear();
    if (typeof window !== "undefined") window.location.href = "/login";
  };
};

/** Las empresas accesibles, releídas del backend. */
export const useEmpresasAccesibles = () => {
  const autenticado = useAuthStore((s) => s.autenticado);

  return useQuery({
    queryKey: ["auth", "empresas"],
    queryFn: authService.empresas,
    enabled: autenticado,
    staleTime: 60_000,
  });
};

export const useCerrarSesion = () => {
  const queryClient = useQueryClient();
  const cerrar = useAuthStore((s) => s.cerrarSesion);

  return useMutation({
    // El backend no tiene `/auth/logout`: no hay refresh token que revocar.
    mutationFn: () => Promise.resolve(undefined),
    onSettled: () => {
      cerrar();
      queryClient.clear();
      // Redirect duro: reinicia el estado del cliente y obliga al proxy a
      // re-evaluar sin cookies.
      if (typeof window !== "undefined") window.location.href = "/login";
    },
  });
};
