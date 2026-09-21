/**
 * Fechas de reporte en palabras, como se leen acá.
 *
 * Las fechas llegan como `AAAA-MM-DD` y se leen **sin pasar por `Date` con la
 * hora local**: `new Date("2026-09-01")` es medianoche UTC, que en Colombia es
 * todavía el 31 de agosto.
 */

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const partes = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return { anio: a, mes: m, dia: d };
};

export const nombreMes = (mes: number) => MESES[mes - 1];
const corto = (mes: number) => MESES[mes - 1].slice(0, 3);

/** «21 sep 2026». */
export function fechaCorta(iso: string): string {
  const { anio, mes, dia } = partes(iso);
  return `${dia} ${corto(mes)} ${anio}`;
}

/** «21 de septiembre de 2026». */
export function fechaLarga(iso: string): string {
  const { anio, mes, dia } = partes(iso);
  return `${dia} de ${nombreMes(mes)} de ${anio}`;
}

/** «1 – 30 sep 2026», «1 ene – 30 sep 2026», «15 dic 2025 – 10 ene 2026». */
export function rangoCorto(desde: string, hasta: string): string {
  const a = partes(desde);
  const b = partes(hasta);
  if (a.anio !== b.anio) return `${fechaCorta(desde)} – ${fechaCorta(hasta)}`;
  if (a.mes !== b.mes) return `${a.dia} ${corto(a.mes)} – ${b.dia} ${corto(b.mes)} ${b.anio}`;
  return `${a.dia} – ${b.dia} ${corto(b.mes)} ${b.anio}`;
}

/** «del 1 al 30 de septiembre de 2026», con el año y el mes una sola vez si se puede. */
export function rangoLargo(desde: string, hasta: string): string {
  const a = partes(desde);
  const b = partes(hasta);
  if (desde === hasta) return `del ${fechaLarga(desde)}`;
  if (a.anio !== b.anio) return `del ${fechaLarga(desde)} al ${fechaLarga(hasta)}`;
  if (a.mes !== b.mes) {
    return `del ${a.dia} de ${nombreMes(a.mes)} al ${b.dia} de ${nombreMes(b.mes)} de ${b.anio}`;
  }
  return `del ${a.dia} al ${b.dia} de ${nombreMes(b.mes)} de ${b.anio}`;
}

/** `dd/mm/aaaa` → `AAAA-MM-DD`, o `null` si no es una fecha que exista. */
export function deTextoAIso(texto: string): string | null {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [dia, mes, anio] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  if (f.getUTCFullYear() !== anio || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== dia) {
    return null;
  }
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** `AAAA-MM-DD` → `dd/mm/aaaa`. */
export function deIsoATexto(iso: string): string {
  const { anio, mes, dia } = partes(iso);
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;
}

/**
 * «Hoy 10:42», «Ayer 15:10», «18 sep», «18 sep 2025». En hora de Colombia.
 */
export function ultimaVez(instante: string, hoy: string): string {
  const fmt = (opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", ...opciones });
  const fecha = new Date(instante);
  const dia = fmt({ year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(fecha)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const iso = `${dia.year}-${dia.month}-${dia.day}`;
  const hora = fmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(fecha);

  const ayer = (() => {
    const { anio, mes, dia: d } = partes(hoy);
    const f = new Date(Date.UTC(anio, mes - 1, d - 1));
    return f.toISOString().slice(0, 10);
  })();

  if (iso === hoy) return `Hoy ${hora}`;
  if (iso === ayer) return `Ayer ${hora}`;
  const { anio, mes, dia: d } = partes(iso);
  return anio === partes(hoy).anio ? `${d} ${corto(mes)}` : `${d} ${corto(mes)} ${anio}`;
}

/** «2 páginas» → «2 págs.»; «1 página» → «1 pág.». */
export const paginasCorto = (texto: string) =>
  texto.replace(/páginas/, "págs.").replace(/página$/, "pág.");
