"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { mensajeDeError } from "@/core/api/api";
import { useAuthStore } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { destinoAlEntrar } from "@/modules/configuracion/lib/entrada";
import { configuracionService } from "@/modules/configuracion/services/configuracion.service";
import { sesionPlataforma } from "@/modules/plataforma/services/plataforma.service";
import { ultimaEmpresa } from "../lib/ultimaEmpresa";
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
 * Si el usuario tiene una sola empresa se entra directo. Con varias, `/empresa`
 * entra a la última que usó; cambiar de empresa se hace desde la barra superior.
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

      // Una cuenta nueva empieza por crear su empresa: es el primer paso del
      // recorrido. Con varias, `/empresa` entra a la última que se usó.
      aviso.exito(`Hola, ${usuario.nombre}`);
      router.push(
        empresas.length === 0 && roles.includes("ADMIN_TENANT")
          ? "/configuracion/empresa-nueva"
          : "/empresa",
      );
    },
    // El mensaje sale del intento de cliente y es el mismo en los dos casos:
    // decir "ese correo es de administración" delataría quién administra.
    //
    // `error` y no `falla`: acá un 401 es "clave mal escrita", no "la sesión se
    // venció", y `falla` lo callaría —para él un 401 ya lo resolvió el
    // interceptor mandando al login, que es justo donde se está—.
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
export const useElegirEmpresa = (
  opciones: {
    /**
     * Adónde ir, cuando ya se sabe: quien acaba de crear la empresa eligiendo
     * «A mano» o «Con IA» no tiene que volver a elegir en la bienvenida.
     */
    destino?: string;
    /** Algo que hacer ya dentro de la empresa, antes de ir: subir el RUT. */
    despues?: () => Promise<void>;
  } = {},
) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const guardarEleccion = useAuthStore((s) => s.elegirEmpresa);
  const actualizarEmpresas = useAuthStore((s) => s.actualizarEmpresas);

  return useMutation({
    mutationFn: (empresaId: string) =>
      authService.elegirEmpresa(empresaId).then((r) => ({ ...r, empresaId })),
    onSuccess: async ({ token, empresaId, roles }) => {
      // Los roles llegan ya sumados: los de la empresa mas los de la cuenta.
      guardarEleccion(token, empresaId, roles);
      ultimaEmpresa.guardar(empresaId);
      // La lista se relee: una empresa recién creada no estaba cuando se entró,
      // y sin ella la barra superior decía «Sin empresa».
      await authService
        .empresas()
        .then(actualizarEmpresas)
        .catch(() => undefined);
      // Sin datos de la empresa anterior en caché: son contabilidades distintas.
      queryClient.clear();

      // Al asistente va solo la empresa recién entregada, a la que le falta todo:
      // mandarla al tablero mostraría seis tarjetas en ámbar sin decirle por
      // dónde empezar. La que ya configuró algo entra a operar: el tablero le
      // muestra lo que falta —una resolución, típicamente— con su "Continuar",
      // y no se puede obligar a quien lleva meses trabajando a pasar por el
      // asistente cada vez que entra.
      //
      // Y con nada hecho no entra al primer paso sino a la **bienvenida**, que
      // es donde se elige entre llenarlo a mano o dejárselo a la IA. Esa
      // decisión se toma una sola vez y solo tiene sentido al principio:
      // ofrecérsela a alguien que ya llenó dos pasos sería hacerle repetir algo
      // que ya resolvió. Por eso la condición es "no tocó nada" y no "está
      // incompleta" —el enlace de la barra lateral y el «Continuar» del tablero
      // siguen entrando directo al paso—. Qué es "nada" lo decide
      // `destinoAlEntrar`: el paso «Empresa» nace listo y no cuenta.
      if (opciones.despues !== undefined) {
        await opciones.despues().catch(() => undefined);
      }
      if (opciones.destino !== undefined) {
        router.push(opciones.destino);
        return;
      }
      try {
        const estado = await configuracionService.estado();
        router.push(destinoAlEntrar(estado));
      } catch {
        // Si el estado no responde, el tablero igual lo vuelve a pedir y muestra
        // el error ahí. Quedarse en la pantalla de carga sería peor.
        router.push("/dashboard");
      }
    },
    onError: (error: unknown) => aviso.falla(error),
  });
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
