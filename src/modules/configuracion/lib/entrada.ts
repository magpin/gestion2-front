import type { EstadoConfiguracion } from "../types/configuracion.types";

/**
 * Adónde entra quien acaba de elegir una empresa: a la bienvenida —donde se
 * elige entre configurar con IA o a mano— o al tablero.
 *
 * **La bienvenida es para la empresa que no se tocó desde que se creó.** La
 * regla era `completados === 0` y nunca se cumplía: el paso «Empresa» queda
 * listo en el mismo momento en que se crea —la configuración contable nace con
 * ella—, así que toda empresa creada desde la aplicación entraba con 1 de 5 y
 * caía en el tablero, sin ver nunca las dos opciones.
 *
 * Lo que cuenta es el resto: si ninguno de los otros pasos se empezó, elegir el
 * modo todavía tiene sentido. Si alguien ya llenó uno, entra a operar y el
 * tablero le dice qué falta —obligarlo a volver a elegir sería hacerle repetir
 * una decisión que ya tomó—.
 */
export function destinoAlEntrar(
  estado: EstadoConfiguracion,
): "/dashboard" | "/configuracion/bienvenida" | "/configuracion/ia" {
  if (estado.siguiente === null) return "/dashboard";
  // Quien eligió IA vuelve a IA hasta terminar: es donde quedó su recorrido.
  if (estado.modo === "IA") return "/configuracion/ia";
  const sinTocar = estado.pasos
    .filter((p) => p.clave !== "EMPRESA")
    .every((p) => p.estado === "PENDIENTE" || p.estado === "BLOQUEADO");
  return sinTocar ? "/configuracion/bienvenida" : "/dashboard";
}
