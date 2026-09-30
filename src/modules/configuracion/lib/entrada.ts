import type { EstadoConfiguracion } from "../types/configuracion.types";

/** Los roles que pueden llenar la configuración (los de los pasos en el backend). */
export const ROLES_CONFIGURACION = ["ADMIN_TENANT", "DIRECTOR", "CONTADOR"] as const;

/**
 * Adónde va quien entra a una empresa, o quien anda por el área de trabajo:
 * mientras la configuración no esté completa, **siempre a la configuración**
 * (decisión del dueño, 30-09-2026). Operar con una empresa a medio configurar
 * termina en errores —una factura sin resolución, una caja sin cuenta— que la
 * persona no sabe de dónde salen.
 *
 * - Completa: al tablero.
 * - Quien eligió IA vuelve a IA hasta terminar: es donde quedó su recorrido.
 * - Recién creada —«Empresa» nace lista y no cuenta; lo demás sin tocar—: a
 *   la bienvenida, donde se elige entre IA y a mano.
 * - Si ya empezó: directo al paso que sigue.
 */
export function destinoAlEntrar(estado: EstadoConfiguracion): string {
  if (estado.siguiente === null) return "/dashboard";
  if (estado.modo === "IA") return "/configuracion/ia";
  const sinTocar = estado.pasos
    .filter((p) => p.clave !== "EMPRESA")
    .every((p) => p.estado === "PENDIENTE" || p.estado === "BLOQUEADO");
  return sinTocar ? "/configuracion/bienvenida" : `/configuracion/${estado.siguiente.toLowerCase()}`;
}

/**
 * Las páginas del área de trabajo a las que la configuración manda a mirar
 * algo (el catálogo del plan de cuentas desde el paso «Plan de cuentas»): no
 * se bloquean, o el paso mandaría a una página que lo devuelve.
 */
const PERMITIDAS_SIN_CONFIGURAR = ["/dashboard/plan-cuentas"];

export function permitidaSinConfigurar(ruta: string): boolean {
  return PERMITIDAS_SIN_CONFIGURAR.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}
