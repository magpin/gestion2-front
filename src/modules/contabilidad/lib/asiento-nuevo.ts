import type { LineaBorrador } from "../components/EditorLineas";
import type { LineaNueva } from "../types/contabilidad.types";
import {
  calcularCuadre,
  nombrarRenglones,
  renglonesSinUnaPata,
} from "./cuadre";

/**
 * Qué impide registrar un asiento, en palabras, o `null`.
 *
 * Un botón apagado sin explicación deja a la persona buscando qué le falta.
 * Se resuelve en orden de bulto: primero lo estructural, después el cuadre.
 * Lo usan el diálogo de asiento y el comprobante manual asistido.
 */
export function problemaDelAsiento(a: {
  comprobanteTipoId: string;
  glosa: string;
  lineas: LineaBorrador[];
}): string | null {
  const { lineas } = a;
  const renglones = (malo: (l: LineaBorrador) => boolean) =>
    lineas
      .map((l, i) => (malo(l) ? i + 1 : null))
      .filter((n): n is number => n !== null);

  if (a.comprobanteTipoId === "") return "Elija el tipo de comprobante.";
  if (a.glosa.trim().length < 3)
    return "La glosa explica por qué existe el asiento. Es obligatoria.";
  if (lineas.length < 2)
    return "Un asiento lleva al menos dos líneas: algo se debita contra algo que se acredita.";
  const sinCuenta = renglones((l) => l.cuenta === null);
  if (sinCuenta.length > 0)
    return `Falta la cuenta en ${nombrarRenglones(sinCuenta)}.`;
  const sinPata = renglonesSinUnaPata(lineas);
  if (sinPata.length > 0)
    return `Cada línea lleva débito o crédito, nunca los dos ni ninguno. Revise ${nombrarRenglones(sinPata)}.`;
  if (!calcularCuadre(lineas).cuadra) return "El asiento no cuadra todavía.";
  const faltaTercero = renglones(
    (l) => Boolean(l.cuenta?.exige_tercero) && !l.terceroId,
  );
  if (faltaTercero.length > 0)
    return `Falta el tercero en ${nombrarRenglones(faltaTercero)}.`;
  const faltaCentro = renglones(
    (l) => Boolean(l.cuenta?.exige_centro_costo) && !l.centroCostoId,
  );
  if (faltaCentro.length > 0)
    return `Falta el centro de costo en ${nombrarRenglones(faltaCentro)}.`;
  const faltaBase = renglones(
    (l) => Boolean(l.cuenta?.exige_base_gravable) && l.baseGravable === "",
  );
  if (faltaBase.length > 0)
    return `Falta la base gravable en ${nombrarRenglones(faltaBase)}.`;
  return null;
}

/**
 * Las líneas como viajan al servidor. Los vacíos viajan como ausentes: una
 * cadena vacía no es un uuid ni un monto, y el backend la rechazaría.
 */
export function aLineasNuevas(lineas: LineaBorrador[]): LineaNueva[] {
  return lineas.map((l) => ({
    cuentaId: l.cuenta!.id,
    terceroId: l.terceroId || undefined,
    centroCostoId: l.centroCostoId || undefined,
    baseGravable: l.baseGravable === "" ? undefined : Number(l.baseGravable),
    detalle: l.detalle.trim() || undefined,
    debito: Number(l.debito || 0),
    credito: Number(l.credito || 0),
  }));
}
