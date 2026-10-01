/**
 * El vence que propone el plazo del tercero (PC25): la fecha del documento más
 * los días. Es la misma cuenta del backend (`common/plazo.ts`), para mostrarla
 * antes de guardar.
 */
export function venceConPlazo(fecha: string, dias: number | null | undefined): string | null {
  if (dias === null || dias === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const [a, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}
