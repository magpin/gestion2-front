// Cómo se escriben los números en los campos: pesos enteros con punto de mil y
// cantidades según la unidad.
//
// **El valor y lo que se ve son dos cosas distintas.** El valor es el texto de
// siempre —«30000», «1.5», «-2000»—, con punto decimal y sin separadores, que
// es lo que el formulario convierte con `Number()` y manda al servidor. Lo que
// se ve es ese mismo valor con puntos de mil: «30.000», «1,5». El punto de mil
// no llega nunca al valor, así que lo guardado es exactamente lo digitado.

import type { UnidadMedida } from "@/modules/inventario/types/inventario.types";

/**
 * Las unidades que se fraccionan: medio kilo, litro y medio, 2,3 metros. En el
 * resto —unidad, caja, par, docena— la cantidad es entera.
 */
const UNIDADES_FRACCIONABLES: ReadonlySet<string> = new Set<UnidadMedida>([
  "KG",
  "LB",
  "LT",
  "GAL",
  "MT",
  "M2",
  "M3",
]);

/** Si la cantidad de esta unidad admite decimales. Sin unidad, no. */
export function admiteDecimales(unidad: string | null | undefined): boolean {
  return unidad != null && UNIDADES_FRACCIONABLES.has(unidad);
}

/** Los decimales de una cantidad fraccionable: los que guarda la base. */
export const DECIMALES_CANTIDAD = 6;

/**
 * El valor, como se ve: «30000» → «30.000», «1.5» → «1,5», «-2000» → «-2.000».
 * Un valor que no es un número se muestra tal cual: no se esconde lo que hay.
 */
export function mostrarNumero(valor: string): string {
  if (valor === "" || valor === "-") return valor;
  const partes = /^(-?)(\d*)(?:\.(\d*))?$/.exec(valor);
  if (partes === null) return valor;
  const [, signo, entero, decimales] = partes;
  const conMiles = (entero === "" ? "0" : entero).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  return `${signo}${conMiles}${decimales === undefined ? "" : `,${decimales}`}`;
}

/**
 * Lo que la persona escribió, convertido a valor. `null` si no se acepta —y
 * entonces el campo se queda como estaba—.
 *
 * - Los puntos son de miles: se quitan. «30.000» es treinta mil.
 * - La coma es decimal, y solo se acepta con `decimales`. En un campo entero,
 *   «30,5» se rechaza en vez de volverse 305: el punto de mil se quita, la
 *   coma no se adivina.
 * - Los ceros a la izquierda se van: «007» es 7.
 */
export function leerNumero(
  escrito: string,
  opciones: { decimales?: number; negativo?: boolean } = {},
): string | null {
  const decimales = opciones.decimales ?? 0;
  const limpio = escrito.replace(/\s/g, "");
  const negativo = opciones.negativo === true && limpio.startsWith("-");
  const cuerpo = negativo ? limpio.slice(1) : limpio;

  if (!/^[\d.,]*$/.test(cuerpo)) return null;
  const comas = cuerpo.split(",").length - 1;
  if (comas > (decimales > 0 ? 1 : 0)) return null;

  const [enteroCrudo, decimalCrudo] = cuerpo.split(",");
  const entero = enteroCrudo.replace(/\./g, "").replace(/^0+(?=\d)/, "");
  if (decimalCrudo !== undefined && decimalCrudo.length > decimales)
    return null;

  const signo = negativo ? "-" : "";
  if (decimalCrudo === undefined) return `${signo}${entero}`;
  return `${signo}${entero === "" ? "0" : entero}.${decimalCrudo}`;
}

/** Si el valor es entero. Para decir «esta unidad va en números enteros». */
export function esEntero(valor: string): boolean {
  return valor.trim() === "" || Number.isInteger(Number(valor));
}

/**
 * Una cantidad guardada, como se lee: «4.000000» → «4», «1.500000» → «1,5»,
 * «12000.000000» → «12.000».
 *
 * La base guarda las cantidades con seis decimales (`DECIMALES_CANTIDAD`) para
 * las unidades fraccionables; en pantalla sobran los ceros de la derecha. No se
 * redondea nada: si la cantidad trae decimales, se ven, sea cual sea la unidad.
 */
export function mostrarCantidad(valor: string | null | undefined): string {
  if (valor == null || valor.trim() === "") return "—";
  const limpio = valor.trim();
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return limpio;
  const sinCeros = limpio.includes(".")
    ? limpio.replace(/0+$/, "").replace(/\.$/, "")
    : limpio;
  return mostrarNumero(sinCeros === "-0" ? "0" : sinCeros);
}
