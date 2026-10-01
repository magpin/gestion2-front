import type {
  ColumnaArmador,
  Definicion,
  OrigenArmador,
  TipoColumna,
} from "../types/armador.types";
import { fechaCorta, rangoLargo } from "./fechas";

/**
 * El reporte del que se parte: las columnas que el catálogo marca como
 * iniciales y el mes pasado. **Nunca una pantalla en blanco**: se ajusta algo
 * que ya tiene sentido.
 */
export function definicionInicial(origen: OrigenArmador): Definicion {
  return {
    origen: origen.clave,
    columnas: origen.columnas.filter((c) => c.inicial).map((c) => c.clave),
    fechas: { atajo: "MES_PASADO" },
    filtros: [],
    agrupar: [],
    orden: null,
  };
}

/**
 * Cómo se escribe una celda. Punto de miles y coma decimal, como se escribe
 * acá: `$ 1.284.500`. El dinero va en pesos enteros; las cantidades muestran
 * decimales solo si los hay.
 */
export function celda(valor: string | null, tipo: TipoColumna): string {
  if (valor === null || valor === "") return "—";
  if (tipo === "FECHA") return fechaCorta(valor);
  if (tipo === "DINERO" || tipo === "CANTIDAD") {
    const n = Number(valor);
    if (!Number.isFinite(n)) return valor;
    const conDecimales = tipo === "CANTIDAD" && !Number.isInteger(n);
    const texto = new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: conDecimales ? 2 : 0,
      maximumFractionDigits: tipo === "DINERO" ? 0 : 2,
    }).format(n);
    return tipo === "DINERO" ? `$ ${texto}` : texto;
  }
  return valor;
}

/** «$ 1.200», o «$ 1.200 a $ 5.000». */
const monto = (n: number, tipo: TipoColumna) => celda(String(n), tipo);

/** Una lista de palabras con «y» al final: «A, B y C». */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/**
 * Qué se está viendo, en una frase y en palabras, no en símbolos:
 * «Ventas del 1 al 31 de agosto de 2026, estado: EMITIDA, agrupado por
 * cliente».
 *
 * Es lo que va arriba del resultado. Un reporte que no dice qué filtros tiene
 * se lee como si fuera todo.
 */
export function resumenEnPalabras(
  def: Definicion,
  origen: OrigenArmador,
  rango: { desde: string; hasta: string } | null,
): string {
  const col = (clave: string): ColumnaArmador | undefined =>
    origen.columnas.find((c) => c.clave === clave);
  const partes: string[] = [];

  for (const f of def.filtros) {
    const c = col(f.columna);
    if (!c) continue;
    const nombre = c.etiqueta.toLowerCase();
    if (f.forma === "LISTA") {
      partes.push(
        f.valores.length <= 2
          ? `${nombre}: ${enumerar(f.valores)}`
          : `${nombre}: ${f.valores.length} elegidos`,
      );
    } else if (f.forma === "RANGO") {
      const min = f.minimo ?? null;
      const max = f.maximo ?? null;
      if (min !== null && max !== null) {
        partes.push(`${nombre} entre ${monto(min, c.tipo)} y ${monto(max, c.tipo)}`);
      } else if (min !== null) {
        partes.push(`${nombre} desde ${monto(min, c.tipo)}`);
      } else if (max !== null) {
        partes.push(`${nombre} hasta ${monto(max, c.tipo)}`);
      }
    } else {
      partes.push(`${nombre}: ${f.valor ? "sí" : "no"}`);
    }
  }

  if (def.agrupar.length > 0) {
    partes.push(
      `agrupado por ${enumerar(def.agrupar.map((g) => col(g)?.etiqueta.toLowerCase() ?? g))}`,
    );
  }

  const cuando = rango ? ` ${rangoLargo(rango.desde, rango.hasta)}` : "";
  return [`${origen.etiqueta}${cuando}`, ...partes].join(", ");
}

/**
 * La definición que se manda: sin los filtros que todavía no dicen nada —una
 * lista sin nada marcado, un rango sin bordes—. El servidor los rechazaría, y
 * con razón: no filtran. En la pantalla siguen ahí mientras alguien los llena.
 */
export function limpia(def: Definicion): Definicion {
  return {
    ...def,
    filtros: def.filtros.filter((f) =>
      f.forma === "LISTA"
        ? f.valores.length > 0
        : f.forma === "RANGO"
          ? (f.minimo ?? null) !== null || (f.maximo ?? null) !== null
          : true,
    ),
  };
}
