/**
 * La partida doble en el navegador.
 *
 * El backend valida lo mismo y tiene la última palabra. Esto existe para que la
 * suma se vea mientras se digita: un asiento se arma mirando la diferencia, y
 * esperar al servidor para saber cuánto falta hace imposible el trabajo.
 */

export interface LineaEditable {
  /** Texto crudo del input. Vacío es cero, no un error. */
  debito: string;
  credito: string;
}

/** El dinero se compara en centavos enteros. */
const CENTAVOS = 100;

/**
 * Cadena a centavos.
 *
 * Suma en enteros porque `0.1 + 0.2 !== 0.3` en punto flotante: un asiento de
 * $0.1 contra $0.2 y $0.3 quedaría descuadrado por una diferencia que no existe.
 * La base usa `numeric(18,2)`, que sí es exacto; acá se replica redondeando.
 */
function aCentavos(valor: string): number {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.round(n * CENTAVOS) : 0;
}

export interface Cuadre {
  cuadra: boolean;
  totalDebito: number;
  totalCredito: number;
  /** Siempre positiva. Cuánto falta del lado que dice `falta`. */
  diferencia: number;
  /** De qué lado falta plata. `null` cuando cuadra. */
  falta: "DEBITO" | "CREDITO" | null;
}

/**
 * Si el asiento cuadra, y de qué lado falta cuando no.
 *
 * Decir solo "no cuadra" obliga a sumar a mano las dos columnas para saber para
 * dónde corregir.
 */
export function calcularCuadre(lineas: readonly LineaEditable[]): Cuadre {
  const debito = lineas.reduce((t, l) => t + aCentavos(l.debito), 0);
  const credito = lineas.reduce((t, l) => t + aCentavos(l.credito), 0);
  const diferencia = debito - credito;

  return {
    cuadra: diferencia === 0,
    totalDebito: debito / CENTAVOS,
    totalCredito: credito / CENTAVOS,
    diferencia: Math.abs(diferencia) / CENTAVOS,
    // Si el débito es mayor, lo que falta es crédito.
    falta: diferencia === 0 ? null : diferencia > 0 ? "CREDITO" : "DEBITO",
  };
}

/**
 * Cuánto proponer en la línea nueva para que el asiento cuadre.
 *
 * Es el gesto que más tiempo ahorra: quien digita ya sabe el monto de la
 * contrapartida, y volver a escribirlo es donde aparece el error de tipeo que
 * después hay que buscar.
 *
 * Devuelve de qué lado va y cuánto. Con el asiento cuadrado no propone nada:
 * agregar una tercera línea a un asiento que ya cuadra es un caso real —un
 * descuento, un impuesto— y ahí no hay nada que adivinar.
 */
export function contrapartida(
  lineas: readonly LineaEditable[],
): { lado: "DEBITO" | "CREDITO"; valor: number } | null {
  const { cuadra, falta, diferencia } = calcularCuadre(lineas);
  return cuadra || falta === null ? null : { lado: falta, valor: diferencia };
}

/**
 * Qué líneas no llevan exactamente una pata.
 *
 * Devuelve los renglones en base 1, que es como los ve quien digita. Una línea
 * con débito y crédito a la vez son dos líneas mal escritas; una en cero no
 * aporta al asiento y ensucia el mayor de la cuenta.
 */
export function renglonesSinUnaPata(
  lineas: readonly LineaEditable[],
): number[] {
  return lineas
    .map((l, i) => {
      const d = aCentavos(l.debito);
      const c = aCentavos(l.credito);
      return (d > 0 && c === 0) || (c > 0 && d === 0) ? null : i + 1;
    })
    .filter((n): n is number => n !== null);
}

/** "la línea 3" / "las líneas 3 y 7". El plural importa: se lee en un aviso. */
export function nombrarRenglones(numeros: readonly number[]): string {
  if (numeros.length === 0) return "";
  if (numeros.length === 1) return `la línea ${numeros[0]}`;
  const ultimo = numeros[numeros.length - 1];
  return `las líneas ${numeros.slice(0, -1).join(", ")} y ${ultimo}`;
}
