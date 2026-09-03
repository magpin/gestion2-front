import type { CuentaEmpresa } from "../types/plan-cuentas.types";

/**
 * La lógica del árbol del plan de cuentas, aparte del componente que lo dibuja.
 *
 * Vive acá y no dentro de `ArbolPlan.tsx` porque es lo que se puede verificar
 * sin abrir un navegador: qué cuenta es raíz, qué código le toca al próximo
 * auxiliar. Lo que queda en el componente es puro dibujo.
 */

/** Lo mínimo que estas funciones necesitan saber de una cuenta. */
type Nodo = Pick<CuentaEmpresa, "codigo" | "codigo_padre">;

/**
 * Las cuentas que van al primer nivel del árbol.
 *
 * Raíz es la que no tiene madre, y también aquella cuya madre no está en la
 * lista: al filtrar por texto puede coincidir el auxiliar y no su cuenta madre,
 * y sin esto el resultado no se mostraría nunca.
 */
export function raices<T extends Nodo>(cuentas: T[]): T[] {
  const presentes = new Set(cuentas.map((c) => c.codigo));
  return cuentas.filter((c) => c.codigo_padre === null || !presentes.has(c.codigo_padre));
}

/**
 * El código que le toca al próximo auxiliar de una cuenta.
 *
 * Dos dígitos de consecutivo sobre el código de la madre, que es como estaba
 * numerada la base Access de origen: `110505` -> `11050501`. El decreto termina
 * en seis dígitos y de ahí para abajo el código lo elige la empresa; calcularlo
 * evita huecos y repetidos entre hermanos.
 *
 * Se apoya en el mayor y no en la cantidad: si se desactivó un auxiliar del
 * medio, reusar su número dejaría dos cuentas distintas con el mismo código en
 * la historia del libro.
 *
 * Al pasar de 99 se ensancha a tres dígitos en vez de repetir el último.
 */
export function proximoCodigo(madre: string, hijas: Nodo[]): string {
  const sufijos = hijas
    .filter((h) => h.codigo.startsWith(madre))
    .map((h) => h.codigo.slice(madre.length))
    .filter((s) => /^[0-9]+$/.test(s));

  const ancho = Math.max(2, ...sufijos.map((s) => s.length));
  const siguiente = Math.max(0, ...sufijos.map(Number)) + 1;
  const cabe = siguiente <= 10 ** ancho - 1;

  return madre + String(siguiente).padStart(cabe ? ancho : ancho + 1, "0");
}
