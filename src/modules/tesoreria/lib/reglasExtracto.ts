import type { TipoLineaExtracto } from "../types/bancos.types";

/**
 * Lo que una regla del extracto necesita antes de guardarse, sin la cuenta:
 * la cuenta la elige el contador, nunca se sugiere (paso 16, decisión 4).
 */
export interface BorradorRegla {
  nombre: string;
  /** Tal como se escribe: separadas por coma. */
  palabras: string;
  tipoLinea: TipoLineaExtracto;
  concepto: string;
}

/**
 * Las tres que casi todo extracto colombiano trae. Se sugieren las palabras,
 * no la cuenta: una sugerida no existe hasta que alguien le pone cuenta y la
 * guarda.
 *
 * El backend compara por **palabra completa**, sin mayúsculas ni tildes
 * (`normalizarTexto` en `banco.reglas.ts`): «COMISION» no reconoce
 * «COMISIONES». Por eso van las dos formas.
 */
export const REGLAS_SUGERIDAS: readonly BorradorRegla[] = [
  {
    nombre: "4×1000",
    palabras: "GMF, 4X1000, GRAVAMEN",
    tipoLinea: "DEBITO",
    concepto: "Gravamen a los movimientos financieros",
  },
  {
    nombre: "Comisiones",
    palabras: "COMISION, COMISIONES",
    tipoLinea: "DEBITO",
    concepto: "Comisión bancaria",
  },
  {
    nombre: "Cuota de manejo",
    palabras: "CUOTA MANEJO, CUOTA DE MANEJO",
    tipoLinea: "DEBITO",
    concepto: "Cuota de manejo",
  },
];

/** Las palabras escritas con coma, limpias y sin repetir (sin mirar mayúsculas). */
export function leerPalabras(texto: string): string[] {
  const vistas = new Set<string>();
  const palabras: string[] = [];
  for (const cruda of texto.split(",")) {
    const palabra = cruda.trim().replace(/\s+/g, " ");
    const clave = palabra.toUpperCase();
    if (palabra === "" || vistas.has(clave)) continue;
    vistas.add(clave);
    palabras.push(palabra);
  }
  return palabras;
}

/**
 * Lo primero que le falta a la regla para que el backend la acepte, o `null`.
 * Los límites son los de `CrearReglaExtractoDto`.
 */
export function problemaRegla(b: BorradorRegla): string | null {
  const nombre = b.nombre.trim();
  if (nombre.length < 2 || nombre.length > 80) return "El nombre va de 2 a 80 caracteres.";
  const palabras = leerPalabras(b.palabras);
  if (palabras.length === 0) return "Escriba al menos una palabra.";
  if (palabras.length > 10) return "Hasta 10 palabras por regla.";
  const mala = palabras.find((p) => p.length < 2 || p.length > 40);
  if (mala) return `«${mala}»: cada palabra va de 2 a 40 caracteres.`;
  const concepto = b.concepto.trim();
  if (concepto.length < 3 || concepto.length > 300) return "El concepto va de 3 a 300 caracteres.";
  return null;
}
