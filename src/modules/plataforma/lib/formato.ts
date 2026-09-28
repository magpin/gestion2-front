/**
 * Cómo se escriben las cifras en la consola, con las convenciones de Colombia:
 * `$ 27.314.050`, `US$ 1,25`, `22/09/2026`, `14:05`, `900.123.456-8`.
 */

const ZONA = "America/Bogota";

/** Pesos, sin decimales: `$ 27.314.050`. */
export function pesos(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$ ${Math.round(n).toLocaleString("es-CO")}`;
}

/**
 * Dólares: dos decimales, y tres cuando la cifra es de centavos
 * (`US$ 0,028` por respuesta dice más que `US$ 0,03`).
 */
export function dolares(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const decimales = n !== 0 && Math.abs(n) < 0.1 ? 3 : 2;
  return `US$ ${n.toLocaleString("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}`;
}

export const entero = (n: number): string =>
  Math.round(n).toLocaleString("es-CO");

/** `23 %`, o con un decimal si se pide. */
export function porciento(fraccion: number, decimales = 0): string {
  return `${(fraccion * 100).toLocaleString("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })} %`;
}

// Una fecha sin hora (`aaaa-mm-dd`, una columna `date`) es un día del
// calendario: `new Date` la deja a la medianoche UTC y pasada a Bogotá saldría
// el día anterior. Esa se escribe en UTC, tal cual; un instante, en Colombia.
const SIN_HORA = /^\d{4}-\d{2}-\d{2}$/;

const partes = (iso: string, opciones: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: SIN_HORA.test(iso) ? "UTC" : ZONA,
    ...opciones,
  }).format(new Date(iso));

/** `22/09/2026`. */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  return partes(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** `14:05`, en hora de Colombia. */
export function hora(iso: string): string {
  return partes(iso, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** El día en Colombia de una fecha ISO, como `aaaa-mm-dd`. */
function diaDe(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

/**
 * Un acceso como se lee de un vistazo: «Hoy 13:52», «Ayer 18:07» o la fecha.
 * `ahora` se recibe para poder probarlo.
 */
export function cuando(
  iso: string | null | undefined,
  ahora = new Date(),
): string {
  if (!iso) return "Nunca";
  const dia = diaDe(iso);
  const hoy = diaDe(ahora);
  const ayer = diaDe(new Date(ahora.getTime() - 86_400_000));
  if (dia === hoy) return `Hoy ${hora(iso)}`;
  if (dia === ayer) return `Ayer ${hora(iso)}`;
  return fecha(iso);
}

/** «Martes 22/09/2026». */
export function diaLargo(iso: string): string {
  const nombre = partes(iso, { weekday: "long" });
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${fecha(iso)}`;
}

/** `900.123.456-8`. */
export function nit(numero: string, dv?: string | null): string {
  const conPuntos = numero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dv ? `${conPuntos}-${dv}` : conPuntos;
}

/** El nombre del mes: `2026-08` → «agosto». */
export function nombreMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(a, m - 1, 1)));
}

/** Singular o plural según la cantidad: `plural(1, "cuenta")` → «1 cuenta». */
export function plural(
  n: number,
  singular: string,
  pluralDe = `${singular}s`,
): string {
  return `${entero(n)} ${n === 1 ? singular : pluralDe}`;
}

/** Una lista en español: «RUT, Cámara y Resolución». */
export function lista(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}
