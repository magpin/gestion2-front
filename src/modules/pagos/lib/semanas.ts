/**
 * Pagos → Programados (Fase 5 de las pantallas complementarias): los pagos
 * agrupados por semana y cómo quedan las cuentas después de ellos.
 *
 * Las semanas arrancan el lunes (E24). El 4×1000 se suma a lo que sale de un
 * banco no exento (E27): es plata que sale igual.
 */

const DIA = 86_400_000;
const ms = (f: string) => Date.parse(`${f}T00:00:00Z`);
const fecha = (t: number) => new Date(t).toISOString().slice(0, 10);
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** El lunes de la semana de `f`. */
export function lunesDe(f: string): string {
  const d = new Date(ms(f));
  const desdeLunes = (d.getUTCDay() + 6) % 7;
  return fecha(ms(f) - desdeLunes * DIA);
}

export interface Grupo<T> {
  clave: string;
  /** «Esta semana», «Próxima semana», «Más adelante en octubre», «Vencidos». */
  titulo: string;
  /** «29 sep al 4 oct»; vacío en los grupos que no son una semana. */
  rango: string;
  items: T[];
  total: number;
}

const rangoTexto = (lunes: string) => {
  const a = new Date(ms(lunes));
  const b = new Date(ms(lunes) + 6 * DIA);
  return `${a.getUTCDate()} ${CORTOS[a.getUTCMonth()]} al ${b.getUTCDate()} ${CORTOS[b.getUTCMonth()]}`;
};

/**
 * Agrupa por cuándo tocan: lo vencido, esta semana, la próxima, y lo demás
 * por mes. Dentro de cada grupo, por fecha.
 */
export function agruparPorSemana<T extends { fecha: string; valor: number }>(items: T[], hoy: string): Grupo<T>[] {
  const esta = lunesDe(hoy);
  const proxima = fecha(ms(esta) + 7 * DIA);
  const despues = fecha(ms(esta) + 14 * DIA);
  const grupos = new Map<string, Grupo<T>>();
  const orden = [...items].sort((a, b) => a.fecha.localeCompare(b.fecha));
  for (const it of orden) {
    let clave: string;
    let titulo: string;
    let rango = "";
    if (it.fecha < hoy) {
      clave = "0-vencidos";
      titulo = "Ya pasó la fecha";
    } else if (it.fecha < proxima) {
      clave = `1-${esta}`;
      titulo = "Esta semana";
      rango = rangoTexto(esta);
    } else if (it.fecha < despues) {
      clave = `2-${proxima}`;
      titulo = "Próxima semana";
      rango = rangoTexto(proxima);
    } else {
      const mes = it.fecha.slice(0, 7);
      clave = `3-${mes}`;
      titulo = `Más adelante en ${MESES[Number(mes.slice(5)) - 1]}${mes.slice(0, 4) === hoy.slice(0, 4) ? "" : ` de ${mes.slice(0, 4)}`}`;
    }
    const g = grupos.get(clave) ?? { clave, titulo, rango, items: [], total: 0 };
    g.items.push(it);
    g.total += it.valor;
    grupos.set(clave, g);
  }
  return [...grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

/** El 4×1000 de una salida de banco no exenta, al peso. */
export const gmfDe = (valor: number, exenta: boolean) => (exenta ? 0 : Math.round(valor * 0.004));

export interface Proyeccion {
  cuentaId: string;
  /** Lo que tiene hoy. */
  hoy: number;
  /** Lo que queda después de los pagos hasta `hasta`, con su 4×1000. */
  queda: number;
  /** El día hasta el que se proyecta: el último pago programado de esa cuenta. */
  hasta: string | null;
  /** El 4×1000 que suman esos pagos. */
  gmf: number;
}

/**
 * Cómo quedan las cuentas después de los pagos programados, sin contar lo que
 * entre por cobros. Un pago sin cuenta (en efectivo) no mueve ningún banco.
 */
export function proyectarCuentas(
  cuentas: Array<{ id: string; saldo: number; exentaGmf: boolean }>,
  pagos: Array<{ fecha: string; valor: number; cuentaId: string | null }>,
): Proyeccion[] {
  return cuentas.map((c) => {
    const suyos = pagos.filter((p) => p.cuentaId === c.id);
    const gmf = suyos.reduce((t, p) => t + gmfDe(p.valor, c.exentaGmf), 0);
    const sale = suyos.reduce((t, p) => t + p.valor, 0) + gmf;
    const hasta = suyos.reduce<string | null>((h, p) => (h === null || p.fecha > h ? p.fecha : h), null);
    return { cuentaId: c.id, hoy: c.saldo, queda: c.saldo - sale, hasta, gmf };
  });
}
