import type { LineaExtractoResumen } from "../types/bancos.types";

type LineaParaCerrar = Pick<LineaExtractoResumen, "grupo_id" | "nota">;

/**
 * Cómo está explicado el extracto, y si se puede cerrar.
 *
 * Lo único que impide cerrar es una línea del banco que nadie explicó: ni
 * cruzada ni anotada. Un movimiento suelto del libro es una partida de tiempo
 * —la consignación en tránsito, el cheque sin cobrar— y se espera al extracto
 * siguiente; una línea anotada es un error del banco y se le reclama. Es lo
 * mismo que exige `cerrar` en el backend, ni más ni menos: pedir más deja un
 * extracto que nunca se puede cerrar desde la pantalla.
 */
export function estadoDelCierre(lineas: readonly LineaParaCerrar[]): {
  sinExplicar: number;
  porReclamar: number;
  sePuedeCerrar: boolean;
} {
  const sueltas = lineas.filter((l) => l.grupo_id === null);
  const sinExplicar = sueltas.filter((l) => !l.nota).length;
  return {
    sinExplicar,
    porReclamar: sueltas.length - sinExplicar,
    sePuedeCerrar: sinExplicar === 0,
  };
}
