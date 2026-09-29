import type { FilaCalendario } from "../types/impuestos.types";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «Mié 21 oct». */
export function fechaCorta(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  const dia = DIAS[d.getUTCDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

/** El valor que se lleva al formulario: al múltiplo de mil (art. 577 ET). */
export function alMil(valor: number): number {
  return Math.round(valor / 1000) * 1000;
}

export type Tono = "neutro" | "aviso" | "error" | "exito";

/** Cómo se dice en qué va una obligación, y de qué color va la marca. */
export function estadoEnPalabras(f: FilaCalendario): { texto: string; tono: Tono } {
  const { estado, dias, vencida } = f.situacion;
  if (estado === "PAGADA") {
    return { texto: f.declaracion?.pagadaEl ? `Pagada · ${fechaCorta(f.declaracion.pagadaEl)}` : "Pagada", tono: "exito" };
  }
  if (estado === "CAUSANDOSE") return { texto: "Causándose", tono: "neutro" };
  if (vencida) return { texto: `Vencida hace ${-(dias ?? 0)} ${dias === -1 ? "día" : "días"}`, tono: "error" };
  const cuando = dias === null ? "" : dias === 0 ? " · vence hoy" : ` · ${dias} ${dias === 1 ? "día" : "días"}`;
  return estado === "PRESENTADA"
    ? { texto: `Presentada · por pagar${cuando}`, tono: dias !== null && dias <= 3 ? "error" : "aviso" }
    : { texto: `Por presentar${cuando}`, tono: dias !== null && dias <= 3 ? "error" : "aviso" };
}

export const CLASES_TONO: Record<Tono, string> = {
  neutro: "border-border bg-muted text-foreground",
  aviso: "border-warning/30 bg-warning/15 text-foreground",
  error: "border-danger/30 bg-danger/10 text-foreground",
  exito: "border-success/30 bg-success/15 text-foreground",
};

/** «Formulario 350 · 3502600123456», o el municipio para las municipales. */
export function detalleDeFila(f: FilaCalendario): string {
  if (f.municipio !== null) return `Municipio de ${f.municipio.nombre} · no es DIAN`;
  const partes = [f.formulario ? `Formulario ${f.formulario}` : null, f.declaracion?.numeroFormulario ?? null];
  return partes.filter(Boolean).join(" · ");
}

/**
 * El período de al lado: «2026-C3» → «2026-C2» (-1) o «2027-C1» (+1). También
 * bimestres, trimestres, meses («2026-09») y años («2025»).
 */
export function moverPeriodo(periodo: string, pasos: -1 | 1): string {
  if (/^\d{4}$/.test(periodo)) return String(Number(periodo) + pasos);
  const mes = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (mes !== null) {
    const total = Number(mes[1]) * 12 + Number(mes[2]) - 1 + pasos;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  }
  const m = /^(\d{4})-([BCT])(\d)$/.exec(periodo);
  if (m === null) return periodo;
  const cuantos = { B: 6, C: 3, T: 4 }[m[2] as "B" | "C" | "T"];
  let anio = Number(m[1]);
  let n = Number(m[3]) + pasos;
  if (n < 1) {
    anio -= 1;
    n = cuantos;
  } else if (n > cuantos) {
    anio += 1;
    n = 1;
  }
  return `${anio}-${m[2]}${n}`;
}

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** «septiembre a diciembre de 2026», «septiembre de 2026», «2025». */
export function periodoEnPalabras(periodo: string): string {
  const mes = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (mes !== null) return `${MESES_LARGOS[Number(mes[2]) - 1]} de ${mes[1]}`;
  const m = /^(\d{4})-([BCT])(\d)$/.exec(periodo);
  if (m === null) return periodo;
  const meses = { B: 2, C: 4, T: 3 }[m[2] as "B" | "C" | "T"];
  const primero = (Number(m[3]) - 1) * meses;
  return `${MESES_LARGOS[primero]} a ${MESES_LARGOS[primero + meses - 1]} de ${m[1]}`;
}
